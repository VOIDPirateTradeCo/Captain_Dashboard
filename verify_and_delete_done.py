#!/usr/bin/env python3
"""Verify done cards have evidence comments, then delete them."""

import requests
import time
import json
import re

API_KEY = "edb3c4349df2946a8114baadfc9e2ad7"
TOKEN = "ATTA74d859c8715f3a7ed75198d2a6e2dfa7515f0a6cc84b7df07b4e44c8553620f7BE26472F"
DONE_LIST_ID = "6a595669b8f8f99c93392f6c"
BASE_URL = "https://api.trello.com/1"

AUDIT_PREFIXES = [
    "[BUG]", "[GAP]", "[API]", "[LIB]", "[DOCKER]", "[SCRIPT]", "[PANEL]",
    "[STORE]", "[PERF]", "[CI]", "[SECURITY]", "[ADAPTER]", "[OPS]", "[MESH]",
    "[P0]", "[P1]", "[SIR GREEN]", "[FLEET]", "[MASTER]", "[AUTH]",
    "[PINKCADY]", "[STEALTHATTACK]", "[NETBIRD]", "[HEADSCALE]", "[NETMAKER]",
    "[VERIFY]", "[TOOLING]", "[EPIC]", "[RUNBOOK]", "[DOC]", "[AUDIT]", "[BHP]"
]

EVIDENCE_MARKER = "[EVIDENCE 2026-09-03]"

def has_audit_prefix(name):
    """Check if card name starts with any audit prefix."""
    for prefix in AUDIT_PREFIXES:
        if name.startswith(prefix):
            return True
    return False

def api_get(path, params=None):
    """Make a GET request to Trello API."""
    if params is None:
        params = {}
    params["key"] = API_KEY
    params["token"] = TOKEN
    response = requests.get(f"{BASE_URL}{path}", params=params)
    time.sleep(0.35)  # 350ms delay
    return response

def api_delete(path):
    """Make a DELETE request to Trello API."""
    params = {"key": API_KEY, "token": TOKEN}
    response = requests.delete(f"{BASE_URL}{path}", params=params)
    time.sleep(0.35)  # 350ms delay
    return response

def fetch_done_cards():
    """Fetch all cards from the Done list."""
    all_cards = []
    page = 0
    while True:
        response = api_get(f"/lists/{DONE_LIST_ID}/cards", {
            "fields": "id,name,labels",
            "limit": 100,
            "page": page
        })
        if response.status_code != 200:
            print(f"Error fetching cards: {response.status_code} - {response.text}")
            break
        cards = response.json()
        if not cards:
            break
        all_cards.extend(cards)
        page += 1
    return all_cards

def fetch_card_comments(card_id):
    """Fetch comments/actions for a card."""
    response = api_get(f"/cards/{card_id}/actions", {
        "filter": "commentCard",
        "fields": "data"
    })
    if response.status_code == 200:
        return response.json()
    return []

def has_evidence_comment(card_id):
    """Check if a card has a comment with the evidence marker."""
    comments = fetch_card_comments(card_id)
    for action in comments:
        text = action.get("data", {}).get("text", "")
        if EVIDENCE_MARKER in text:
            return True
    return False

def delete_card(card_id):
    """Delete a card."""
    response = api_delete(f"/cards/{card_id}")
    return response.status_code == 200

def main():
    print("Fetching all done cards...")
    all_cards = fetch_done_cards()
    print(f"Total done cards: {len(all_cards)}")

    # Filter to audit-prefixed cards
    audit_cards = [c for c in all_cards if has_audit_prefix(c["name"])]
    print(f"Audit-prefixed cards: {len(audit_cards)}")

    processed = 0
    deleted = 0
    skipped_no_evidence = 0
    errors = 0

    # Process in batches of 10
    for i in range(0, len(audit_cards), 10):
        batch = audit_cards[i:i+10]
        print(f"\n--- Batch {i//10 + 1} (cards {i+1}-{i+len(batch)}) ---")

        for card in batch:
            card_id = card["id"]
            card_name = card["name"]
            processed += 1

            print(f"  Checking: {card_name[:60]}...")
            try:
                if has_evidence_comment(card_id):
                    print(f"    -> EVIDENCE FOUND. Deleting...")
                    if delete_card(card_id):
                        deleted += 1
                        print(f"    -> DELETED")
                    else:
                        errors += 1
                        print(f"    -> DELETE FAILED")
                else:
                    skipped_no_evidence += 1
                    print(f"    -> No evidence comment. Skipping.")
            except Exception as e:
                errors += 1
                print(f"    -> ERROR: {e}")

        # 500ms delay between batches
        if i + 10 < len(audit_cards):
            time.sleep(0.5)

    result = {
        "processed": processed,
        "deleted": deleted,
        "skipped_no_evidence": skipped_no_evidence,
        "errors": errors
    }

    print(f"\n{'='*50}")
    print(f"RESULTS: {json.dumps(result, indent=2)}")
    return result

if __name__ == "__main__":
    main()
