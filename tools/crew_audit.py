#!/usr/bin/env python3
"""
Crew Agent Audit Script
Reads the Mission Control agents DB, identifies stale/duplicate entries,
and outputs a JSON report + cleanup SQL.
"""

import sqlite3
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

# Config
DB_PATH = Path('mission-control/.next/standalone/.data/mission-control.db')
STALE_DAYS = 7
REPORT_PATH = Path('tools/audit_report.json')
CLEANUP_PATH = Path('tools/crew_cleanup.sql')

def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # 1. Read all agents
    rows = conn.execute('SELECT * FROM agents ORDER BY name, last_seen DESC').fetchall()
    agents = [dict(r) for r in rows]
    total = len(agents)

    now = datetime.utcnow()
    cutoff = now - timedelta(days=STALE_DAYS)
    cutoff_ts = int(cutoff.timestamp())

    # 2. Enrich with human-readable timestamps
    for a in agents:
        for field in ('last_seen', 'created_at', 'updated_at'):
            val = a.get(field)
            if val is not None:
                try:
                    a[f'{field}_dt'] = datetime.utcfromtimestamp(val).isoformat()
                except (OSError, ValueError):
                    a[f'{field}_dt'] = None
            else:
                a[f'{field}_dt'] = None
        
        # Extract capabilities from config if available
        caps = []
        if a.get('config'):
            try:
                cfg = json.loads(a['config'])
                caps = cfg.get('capabilities', [])
            except json.JSONDecodeError:
                pass
        a['capabilities_list'] = caps

    # 3. Identify stale (>7 days or never seen + created >7 days ago)
    stale_ids = []
    stale_names = []
    for a in agents:
        is_stale = False
        if a['last_seen'] is not None:
            if a['last_seen'] < cutoff_ts:
                is_stale = True
        elif a['created_at'] is not None:
            if a['created_at'] < cutoff_ts:
                is_stale = True
        
        if is_stale:
            stale_ids.append(a['id'])
            stale_names.append(a['name'])

    # 4. Identify duplicates (same name, keep most recently seen)
    name_groups = defaultdict(list)
    for a in agents:
        name_groups[a['name']].append(a)

    duplicate_ids = []
    duplicate_info = []
    for name, group in name_groups.items():
        if len(group) > 1:
            # Keep the one with the most recent last_seen (or created_at as tiebreaker)
            group.sort(key=lambda x: (x['last_seen'] or 0, x['created_at'] or 0), reverse=True)
            keeper = group[0]
            for dup in group[1:]:
                duplicate_ids.append(dup['id'])
                duplicate_info.append({
                    'name': name,
                    'removed_id': dup['id'],
                    'kept_id': keeper['id'],
                    'reason': 'duplicate'
                })

    # 5. Firecrawl bulk detection (skill-spawned agents that are all offline)
    firecrawl_agents = [a for a in agents if a['name'].startswith('firecrawl')]
    firecrawl_stale = [a for a in firecrawl_agents if a['id'] in stale_ids and a['id'] not in duplicate_ids]

    # 6. Build report
    all_cleanup_ids = set(stale_ids) | set(duplicate_ids)
    
    report = {
        'generated_at': now.isoformat(),
        'total_agents': total,
        'stale_threshold_days': STALE_DAYS,
        'stale_cutoff': cutoff.isoformat(),
        'summary': {
            'total': total,
            'stale_count': len(stale_ids),
            'duplicate_count': len(duplicate_ids),
            'cleanup_count': len(all_cleanup_ids),
            'firecrawl_total': len(firecrawl_agents),
            'firecrawl_stale': len(firecrawl_stale),
        },
        'all_agents': [
            {
                'id': a['id'],
                'name': a['name'],
                'status': a['status'],
                'role': a.get('role'),
                'last_seen': a.get('last_seen_dt'),
                'created_at': a.get('created_at_dt'),
                'capabilities': a.get('capabilities_list', []),
                'source': a.get('source'),
                'is_stale': a['id'] in stale_ids,
                'is_duplicate': a['id'] in duplicate_ids,
            }
            for a in agents
        ],
        'stale_agents': [
            {'id': a['id'], 'name': a['name'], 'last_seen': a.get('last_seen_dt'), 'created': a.get('created_at_dt')}
            for a in agents if a['id'] in stale_ids
        ],
        'duplicates': duplicate_info,
        'firecrawl_inventory': [
            {'id': a['id'], 'name': a['name'], 'status': a['status'], 'last_seen': a.get('last_seen_dt')}
            for a in firecrawl_agents
        ],
        'cleanup_plan': {
            'ids_to_remove': sorted(all_cleanup_ids),
            'sql_file': str(CLEANUP_PATH),
        }
    }

    # 7. Write JSON report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f"JSON report written to {REPORT_PATH}")

    # Build names/ids for cleanup SQL
    cleanup_ids_str = ', '.join(str(i) for i in sorted(all_cleanup_ids))
    names_to_remove = [a['name'] for a in agents if a['id'] in all_cleanup_ids]
    names_quoted = ', '.join(f"'{n}'" for n in names_to_remove)

    # Identify which MC tables reference agents by name
    ref_tables = []
    try:
        tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        for t in tables:
            tname = t[0]
            try:
                cols = conn.execute(f'PRAGMA table_info({tname})').fetchall()
                col_names = [c[1] for c in cols]
                agent_refs = [c for c in col_names if 'agent' in c.lower() or c == 'assigned_to']
                if agent_refs and tname != 'agents':
                    ref_tables.append((tname, agent_refs))
            except Exception:
                pass
    except Exception:
        pass

    sql_lines = [
        "-- Crew Agent Cleanup Script",
        f"-- Generated: {now.isoformat()}",
        f"-- Total agents: {total}",
        f"-- Stale (>{STALE_DAYS} days): {len(stale_ids)}",
        f"-- Duplicates: {len(duplicate_ids)}",
        f"-- Total to remove: {len(all_cleanup_ids)}",
        "",
        "-- WARNING: Review before running! This will permanently delete agents.",
        "-- Review the JSON report first: tools/audit_report.json",
        "",
        "BEGIN TRANSACTION;",
        "",
        "-- Step 1: Remove related records from child tables first",
    ]

    # Add cleanup for each referencing table
    for tname, cols in ref_tables:
        for col in cols:
            sql_lines.append(f"DELETE FROM {tname} WHERE {col} IN ({names_quoted});")

    sql_lines.extend([
        "",
        f"-- Step 2: Remove agent entries (IDs: {cleanup_ids_str})",
        f"DELETE FROM agents WHERE id IN ({cleanup_ids_str});",
        "",
        "COMMIT;",
        "",
        "-- Verification:",
        f"SELECT COUNT(*) AS remaining_after_cleanup FROM agents;",
    ])

    with open(CLEANUP_PATH, 'w') as f:
        f.write('\n'.join(sql_lines) + '\n')
    print(f"Cleanup SQL written to {CLEANUP_PATH}")

    # 9. Print summary
    print(f"\n{'='*60}")
    print(f"CREW AGENT AUDIT SUMMARY")
    print(f"{'='*60}")
    print(f"Total agents in DB:      {total}")
    print(f"Stale (>{STALE_DAYS}d):          {len(stale_ids)}")
    print(f"Duplicates:              {len(duplicate_ids)}")
    print(f"Firecrawl agents:        {len(firecrawl_agents)}")
    print(f"Firecrawl stale:         {len(firecrawl_stale)}")
    print(f"Agents to cleanup:       {len(all_cleanup_ids)}")
    print(f"Agents remaining:        {total - len(all_cleanup_ids)}")
    print(f"\nReport:  {REPORT_PATH}")
    print(f"Cleanup: {CLEANUP_PATH}")
    
    conn.close()
    return report

if __name__ == '__main__':
    main()
