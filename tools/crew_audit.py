#!/usr/bin/env python3
"""
Crew Agent Audit Script
Reads the Mission Control agents DB, identifies stale entries and duplicates,
outputs a JSON report and cleanup SQL script.
"""
import sqlite3
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter

# Paths
WORKSPACE = Path(__file__).parent.parent
DB_PATH = WORKSPACE / "mission-control/.data/mission-control.db"
REPORT_PATH = WORKSPACE / "tools/audit_report.json"
CLEANUP_PATH = WORKSPACE / "tools/crew_cleanup.sql"

# Thresholds
STALE_DAYS = 7


def ts_to_iso(ts):
    """Convert a unix timestamp (seconds or millis) to ISO-8601 string."""
    if ts is None:
        return None
    try:
        if ts > 1e12:
            dt = datetime.utcfromtimestamp(ts / 1000)
        else:
            dt = datetime.utcfromtimestamp(ts)
        return dt.isoformat()
    except (OSError, ValueError, OverflowError):
        return None


def ts_is_stale(ts, threshold):
    """Check if a unix timestamp is older than threshold."""
    if ts is None:
        return True
    try:
        if ts > 1e12:
            dt = datetime.utcfromtimestamp(ts / 1000)
        else:
            dt = datetime.utcfromtimestamp(ts)
        return dt < threshold
    except (OSError, ValueError, OverflowError):
        return True


def main():
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]

    # Verify agents table exists
    if 'agents' not in tables:
        print("ERROR: agents table not found in database")
        conn.close()
        return

    # Load agents
    cur.execute("SELECT * FROM agents ORDER BY last_seen DESC")
    rows = cur.fetchall()

    now = datetime.utcnow()
    stale_threshold = now - timedelta(days=STALE_DAYS)

    agents = []
    stale_agents = []
    name_counter = Counter()

    for row in rows:
        d = dict(row)
        name = d.get('name', 'unknown')
        status = d.get('status', 'unknown')
        last_seen_ts = d.get('last_seen')
        config_raw = d.get('config', '{}')
        runtime_type = d.get('runtime_type', 'N/A')

        try:
            cfg = json.loads(config_raw) if config_raw else {}
        except (json.JSONDecodeError, TypeError):
            cfg = {}

        capabilities = cfg.get('capabilities', [])
        hostname = cfg.get('hostname', cfg.get('host', 'N/A'))
        last_seen = ts_to_iso(last_seen_ts)
        is_stale = ts_is_stale(last_seen_ts, stale_threshold)
        name_counter[name] += 1

        entry = {
            "name": name,
            "hostname": hostname,
            "status": status,
            "last_seen": last_seen,
            "capabilities": capabilities,
            "runtime_type": runtime_type,
            "is_stale": is_stale,
            "last_seen_unix": last_seen_ts,
        }
        agents.append(entry)
        if is_stale:
            stale_agents.append(entry)

    # Find duplicates
    duplicates = {name: count for name, count in name_counter.items() if count > 1}

    # Firecrawl breakdown
    firecrawl = [a for a in agents if 'firecrawl' in a['name'].lower()]
    firecrawl_stale = [a for a in firecrawl if a['is_stale']]

    # Build report
    report = {
        "generated_at": now.isoformat(),
        "database": str(DB_PATH),
        "stale_threshold_days": STALE_DAYS,
        "summary": {
            "total_agents": len(agents),
            "online": sum(1 for a in agents if a['status'] == 'online'),
            "offline": sum(1 for a in agents if a['status'] == 'offline'),
            "stale_count": len(stale_agents),
            "duplicate_groups": len(duplicates),
            "firecrawl_total": len(firecrawl),
            "firecrawl_stale": len(firecrawl_stale),
            "remaining_after_cleanup": len(agents) - len(stale_agents),
        },
        "agents": agents,
        "stale_agents": stale_agents,
        "duplicates": duplicates,
        "firecrawl_inventory": firecrawl,
    }

    # Write report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_PATH, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    print(f"Audit report written to {REPORT_PATH}")

    # Generate cleanup SQL
    # Related tables that reference agents by name
    related_tables = []
    agent_name_cols = {
        'tasks': 'assigned_to',
        'comments': 'author',
        'notifications': 'recipient',
        'task_subscriptions': 'agent_name',
        'quality_reviews': 'reviewer',
        'messages': 'from_agent',
        'messages_to': 'to_agent',
        'token_usage': 'agent_name',
        'security_events': 'agent_name',
        'project_agent_assignments': 'agent_name',
        'eval_runs': 'agent_name',
        'eval_traces': 'agent_name',
        'mcp_call_log': 'agent_name',
        'spawn_history': 'agent_name',
        'runs': 'agent_name',
        'activities': 'actor',
        'audit_log': 'actor',
        'webhooks': 'created_by',
        'workflow_templates': 'created_by',
        'workflow_pipelines': 'created_by',
    }

    lines = []
    lines.append("-- Crew Agent Cleanup SQL")
    lines.append(f"-- Generated: {now.isoformat()}")
    lines.append(f"-- Removes {len(stale_agents)} stale agents (>7 days) and related records")
    lines.append("--")
    lines.append("-- WARNING: Review before executing. This will DELETE data.")
    lines.append("")
    lines.append("BEGIN TRANSACTION;")
    lines.append("")

    for agent in stale_agents:
        name_escaped = agent['name'].replace("'", "''")

        # Related table cleanup
        for table, col in agent_name_cols.items():
            if table in tables:
                lines.append(f"DELETE FROM {table} WHERE {col} = '{name_escaped}';")

        # Agent spawn_history by agent_id (integer FK)
        lines.append(f"DELETE FROM spawn_history WHERE agent_name = '{name_escaped}';")

        # Runs by agent_name
        lines.append(f"DELETE FROM runs WHERE agent_name = '{name_escaped}';")

        # Agent API keys via subquery on agent id
        lines.append(f"DELETE FROM agent_api_keys WHERE agent_id IN (SELECT id FROM agents WHERE name = '{name_escaped}');")

        # Direct connections via agent_id FK
        lines.append(f"DELETE FROM direct_connections WHERE agent_id IN (SELECT id FROM agents WHERE name = '{name_escaped}');")

        # Ship agents via agent_id FK
        lines.append(f"DELETE FROM ship_agents WHERE agent_id IN (SELECT id FROM agents WHERE name = '{name_escaped}');")

        # Agent keys via agent_id FK
        lines.append(f"DELETE FROM agent_keys WHERE agent_id IN (SELECT id FROM agents WHERE name = '{name_escaped}');")

        # Finally delete the agent
        lines.append(f"DELETE FROM agents WHERE name = '{name_escaped}';")
        lines.append("")

    lines.append("COMMIT;")

    with open(CLEANUP_PATH, 'w') as f:
        f.write('\n'.join(lines))
    print(f"Cleanup SQL written to {CLEANUP_PATH}")

    conn.close()

    # Print summary
    print(f"\n=== AUDIT SUMMARY ===")
    print(f"Total agents: {len(agents)}")
    print(f"Online: {report['summary']['online']}")
    print(f"Offline: {report['summary']['offline']}")
    print(f"Stale (>7 days): {len(stale_agents)}")
    print(f"Duplicate groups: {len(duplicates)}")
    print(f"Firecrawl agents: {len(firecrawl)} (stale: {len(firecrawl_stale)})")
    print(f"Remaining after cleanup: {report['summary']['remaining_after_cleanup']}")


if __name__ == "__main__":
    main()
