#!/usr/bin/env python3
"""Batch process all bug cards on VOID Ops board"""
import sys
sys.path.insert(0, '.')

BUG_CARDS = [
    "6a80fd80fb4716c2460d1047",  # BUG-5: Fix Prometheus container
    "6a7d51d6ebfe1ed4c8011a84",  # Alpaca PAPER trading
    "6a7c10f964cec680ed20d41c",  # POST /api/augur/scan/status 405
    "6a7c029d1ebf23d5573f7cbf",  # API endpoints return HTML instead of JSON
    "6a8466e8cb602f71526fda35",  # P0: 6 ContainerDown alerts
    "6a7b21f013f045584b83d501",  # Cipher tools missing
    "6a846c2b4db6154331cdc18c",  # P1: Black CMD windows
    "6a76c096dcf350504477bdae",  # ticket_alert_bot.py memory leak
    "6a76c0952a59e2a8da1c22d4",  # ticket_alert_bot.py rate limit
    "6a73f4d80559a683c5242e03",  # OODA loop Discord spam
    "6a84110afda2477793812722",  # P2: prometheus.yml missing targets
    "6a8274bef76e566618453095",  # DOWNLOAD-BUTTONS-1
    "6a810c025cc4bc158f48b62a",  # BUG-6: duplicate Bracket/OCO HTML
    "6a810c00ffacc04f04cf8bbd",  # BUG-2: download progress polling
    "6a810c00519e33a52810f288",  # BUG-1: download quick_update
    "6a80fd8051f5ae7bcae185b0",  # BUG-6: Verify download flow
    "6a80fd7e2bfe7680742beedc",  # BUG-1: Fix download quick_update
    "6a7d69a44981bdeca276bf08",  # P2: 5 missing security headers
    "6a7d56f901f4f9394774ed18",  # Dashboard/TM API missing GZIP
    "6a841fd04790ee8d775e20e6",  # P2: POS/inventory lack prometheus_client
    "6a842008ee163a3c24ee602b",  # P2: cAdvisor missing /etc/machine-id
    "6a7d56e2b43877dcf7b798dd",  # TM API download_status empty
    "6a7d56e8235bfbacf5ea821e",  # Alpaca last_gap_check=None
    "6a7d56ff4d9278611a5b6d54",  # API responses missing Cache-Control
    "6a7a6ab2fe9e5e7b7550ad2c",  # Wire augmented scoring
    "6a841129736461f291510f07",  # P2: Add prometheus_client
    "6a7d56f443da7c5d2ff2da49",  # Dashboard API HTTP/1.1
    "6a7c17eef4918c79a371129b",  # applyTools() schema mismatch
    "6a7c1103decfd75376b39d40",  # Fund download pipeline DEAD
    "6a7c02997180f84dae9c1e4a",  # torus-dashboard OOM
    "6a846716bf0a1bc48e63927c",  # P0: 6/9 Prometheus targets DOWN
    "6a8467459502faa814948f52",  # P0: No Alertmanager deployed
    "6a867948245e1fedbe06d40a",  # ARCHIVED BOARD REVIEW
]

from fodavp_engine import run_fodavp

def classify_result(result):
    """Classify engine result into pass/skip/fail"""
    if not isinstance(result, dict):
        return 'failed', str(result)
    
    status = result.get('status', '')
    result_field = result.get('result', '')
    
    if result_field == 'PASS' or status == 'completed':
        return 'pass', result
    elif result_field == 'NEEDS_CAPTAIN' or status == 'no_executable_card':
        return 'needs_captain', result
    elif status == 'timeout':
        return 'timeout', result
    else:
        return 'failed', result

print(f"🍳⚔️ BATCH MODE: Processing {len(BUG_CARDS)} bug cards")
print("=" * 60)

completed = 0
needs_captain = 0
failed = 0
timeout = 0

for i, card_id in enumerate(BUG_CARDS, 1):
    print(f"\n[{i}/{len(BUG_CARDS)}] Card: {card_id}")
    try:
        result = run_fodavp(card_id=card_id)
        category, details = classify_result(result)
        
        if category == 'pass':
            completed += 1
            print(f"  ✅ PASS")
        elif category == 'needs_captain':
            needs_captain += 1
            print(f"  ⏸️ NEEDS CAPTAIN")
        elif category == 'timeout':
            timeout += 1
            print(f"  ⏱️ TIMEOUT")
        else:
            failed += 1
            print(f"  ❌ FAILED: {details}")
    except Exception as e:
        failed += 1
        print(f"  ❌ ERROR: {e}")

print("\n" + "=" * 60)
print(f"🍳⚔️ BATCH COMPLETE")
print(f"  ✅ Completed: {completed}")
print(f"  ⏸️ Needs Captain: {needs_captain}")
print(f"  ⏱️ Timeout: {timeout}")
print(f"  ❌ Failed: {failed}")
print(f"  📊 Total: {len(BUG_CARDS)}")
