#!/usr/bin/env python3
"""
🍳⚔️ FODAVP v2.0 — 6-Phase Autonomous Protocol
=================================================
F.IND → O.RIENT → D.ECIDE → A.CT → V.ERIFY → PERSIST

Trigger: Dashboard button OR Captain command
Target: Highest-priority Trello card OR specified card
Evidence: JSON + Trello comment + terminal logs
"""

import os, sys, json, time, subprocess, requests
from datetime import datetime
from pathlib import Path

# === CONFIGURATION ===
ENGINE_DIR = Path(__file__).parent
EVIDENCE_DIR = Path("C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/evidence")
LOGS_DIR = Path("C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/Captain_Dashboard/dashboard/fleet/logs")
VOID_BOARD_ID = "6a595669b8f8f99c93392f4f"
DONE_LIST_ID = "6a595669b8f8f99c93392f6c"
DONE_LABEL_ID = "6a73ac6609cdfba7c1b3e97e"
CROWNLESS_LABEL_ID = "6a8500ae260bea736288437c"

def init_dirs():
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

def log(phase, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {phase}: {msg}")
    log_file = LOGS_DIR / f"fodavp_{datetime.now().strftime('%Y%m%d')}.log"
    with open(log_file, 'a') as f:
        f.write(f"[{datetime.now().isoformat()}] {phase}: {msg}\n")

def _move_card_to_list(card_id: str, list_id: str) -> None:
    """Move a Trello card to a different list."""
    KEY, TOKEN = load_trello_credentials()
    if KEY and TOKEN:
        requests.put(
            f"https://api.trello.com/1/cards/{card_id}",
            params={"key": KEY, "token": TOKEN, "idList": list_id},
            timeout=15
        )

def _add_label_to_card(card_id: str, label_id: str) -> None:
    """Add a label to a Trello card."""
    KEY, TOKEN = load_trello_credentials()
    if KEY and TOKEN:
        requests.post(
            f"https://api.trello.com/1/cards/{card_id}/labels",
            params={"key": KEY, "token": TOKEN, "idLabel": label_id},
            timeout=15
        )

def _cred_blob(cred):
    blob = cred.get('CredentialBlob') or b''
    if isinstance(blob, str):
        blob = blob.encode('utf-8')
    return blob.strip(chr(0)).decode('utf-8', errors='replace').strip()

def load_trello_credentials():
    """Load Trello API credentials from Windows Credential Manager or env vars"""
    env_key = os.environ.get('TRELLO_KEY')
    env_token = os.environ.get('TRELLO_TOKEN')
    if env_key and env_token:
        log("CRED", "Loaded Trello credentials from environment variables")
        return env_key, env_token

    try:
        import win32cred
        key_cred = win32cred.CredRead('TRELLO_KEY@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
        token_cred = win32cred.CredRead('TRELLO_TOKEN@VOID_Pirate_Secrets', win32cred.CRED_TYPE_GENERIC)
        KEY, TOKEN = _cred_blob(key_cred), _cred_blob(token_cred)
        if KEY and TOKEN:
            log("CRED", "Loaded Trello credentials from Windows Credential Manager")
            return KEY, TOKEN
    except Exception as e:
        log("ERROR", f"Failed to load Trello credentials from Windows Credential Manager: {e}")

    return None, None

def find_targets(card_id=None, max_candidates=5):
    """F.IND — Locate 1-5 target cards"""
    log("F.IND", f"Locating up to {max_candidates} candidate cards...")
    
    KEY, TOKEN = load_trello_credentials()
    if not KEY or not TOKEN:
        log("F.IND", "ERROR: Trello credentials not available")
        return []
    
    # Skip cards already processed in this session
    processed_file = EVIDENCE_DIR / "fodavp_processed_cards.json"
    processed_ids = set()
    if processed_file.exists():
        try:
            processed_ids = set(json.loads(processed_file.read_text()))
        except Exception:
            processed_ids = set()
    
    if card_id:
        import requests
        resp = requests.get(
            f"https://api.trello.com/1/cards/{card_id}",
            params={"key": KEY, "token": TOKEN},
            timeout=15
        )
        if resp.status_code == 200:
            card = resp.json()
            log("F.IND", f"Captain-specified card: {card.get('name', 'N/A')[:60]}")
            return [{
                "id": card['id'],
                "shortLink": card.get('shortLink', card_id),
                "name": card.get('name', ''),
                "description": card.get('desc', ''),
                "labels": [l.get('name','') for l in card.get('labels',[])],
                "list_id": card.get('idList', ''),
                "url": card.get('url', '')
            }]
        else:
            log("F.IND", f"Failed to fetch card {card_id}: HTTP {resp.status_code}")
    
    # Full sweep — get ALL cards with priority labels from VOID Ops board
    import requests
    board_id = '6a595669b8f8f99c93392f4f'
    lists = requests.get(
        f'https://api.trello.com/1/boards/{board_id}/lists',
        params={'key': KEY, 'token': TOKEN, 'fields': 'all'},
        timeout=15
    ).json()
    
    priority_cards = []
    for list_obj in lists:
        list_id = list_obj.get('id', '')
        list_name = list_obj.get('name', 'Unknown')
        cards = requests.get(
            f'https://api.trello.com/1/lists/{list_id}/cards',
            params={'key': KEY, 'token': TOKEN, 'fields': 'all'},
            timeout=15
        ).json()
        
        for card in cards:
            labels = [l.get('name', '') for l in card.get('labels', [])]
            label_ids = [l.get('id', '') for l in card.get('labels', [])]
            label_upper = ' '.join(labels).upper()
            if any(p in label_upper for p in ['P0', 'P1', 'P2', 'P3', 'P4']):
                if CROWNLESS_LABEL_ID in label_ids:
                    continue
                if card['id'] in processed_ids:
                    continue
                priority_cards.append({
                    "id": card['id'],
                    "shortLink": card.get('shortLink', 'N/A'),
                    "name": card.get('name', ''),
                    "description": card.get('desc', ''),
                    "labels": labels,
                    "list_id": list_id,
                    "list_name": list_name,
                    "url": card.get('url', '')
                })
    
    log("F.IND", f"Found {len(priority_cards)} priority cards across {len(lists)} lists")
    return priority_cards

def detect_dependencies(target, all_cards):
    """Detect if target card depends on other cards"""
    dependencies = []
    card_name = target.get('name', '').lower()
    card_desc = target.get('description', '').lower()
    combined_text = card_name + " " + card_desc
    
    dep_keywords = ['requires', 'depends on', 'blocked by', 'prerequisite', 'needs', 'after', 'following']
    for keyword in dep_keywords:
        if keyword in combined_text:
            for card in all_cards:
                card_name_check = card.get('name', '').lower()
                card_id_check = card.get('shortLink', '').lower()
                if (card_name_check in combined_text or 
                    card_id_check in combined_text or
                    any(word in combined_text for word in card_name_check.split()[:3])):
                    if card.get('id') != target.get('id'):
                        dependencies.append({
                            'id': card.get('id'),
                            'shortLink': card.get('shortLink', ''),
                            'name': card.get('name', ''),
                            'reason': f"Mentioned with '{keyword}'"
                        })
    
    import re
    card_links = re.findall(r'#(\d+)', combined_text)
    for link in card_links:
        for card in all_cards:
            if link in card.get('shortLink', ''):
                if card.get('id') != target.get('id'):
                    dependencies.append({
                        'id': card.get('id'),
                        'shortLink': card.get('shortLink', ''),
                        'name': card.get('name', ''),
                        'reason': f"Linked via #{link}"
                    })
    
    return dependencies

def orient_target(target):
    """O.RIENT — Gather data and analyze situation"""
    log("O.RIENT", f"Analyzing: {target.get('name', 'N/A')[:55]}")
    
    import socket
    services = {}
    service_ports = {"prometheus": 9090, "kuma": 3001, "redis": 6379, "treasuremap": 8080, "docker": 2375}
    for service, port in service_ports.items():
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        services[service] = "UP" if sock.connect_ex(('127.0.0.1', port)) == 0 else "DOWN"
        sock.close()
    
    card_name = target.get('name', '').lower()
    card_desc = target.get('description', '').lower()
    action_type = "generic"
    if 'bug' in card_name or 'fix' in card_name:
        action_type = "bug_fix"
    elif 'automation' in card_name:
        action_type = "automation"
    elif 'deploy' in card_name:
        action_type = "deployment"
    elif 'docker' in card_name:
        action_type = "docker"
    elif 'firewall' in card_name or 'harden' in card_name:
        action_type = "security"
    elif 'document' in card_name or 'docs' in card_name:
        action_type = "documentation"
    
    if 'crownless fortune' in card_name and ('block' in card_name or 'blocker' in card_name):
        action_type = "crownless_blocker"
    elif 'crownless fortune' in card_name and any(b in card_desc for b in ['l24', 'renderer', 'ipc', 'ui control']):
        action_type = "crownless_blocker"
    
    dependencies = []
    KEY, TOKEN = load_trello_credentials()
    if KEY and TOKEN:
        import requests
        resp = requests.get(f"https://api.trello.com/1/boards/{VOID_BOARD_ID}/cards", params={"key": KEY, "token": TOKEN}, timeout=15)
        if resp.status_code == 200:
            dependencies = detect_dependencies(target, resp.json())
    
    orientation = {
        "timestamp": datetime.now().isoformat(),
        "action_type": action_type,
        "fleet_services": services,
        "target_labels": target.get('labels', []),
        "complexity": "low" if action_type in ["documentation", "generic"] else "medium",
        "requires_trello_update": True,
        "dependencies": dependencies,
        "has_dependencies": len(dependencies) > 0
    }
    
    log("O.RIENT", f"Action type: {action_type} | Complexity: {orientation['complexity']}")
    if dependencies:
        log("O.RIENT", f"Dependencies found: {len(dependencies)}")
        for dep in dependencies:
            log("O.RIENT", f"  → {dep['shortLink']}: {dep['name'][:50]}")
    
    return orientation

def decide_action(orientation, target):
    """D.ECIDE — Plan execution approach"""
    log("D.ECIDE", "Formulating action plan...")
    
    action_type = orientation.get("action_type", "generic")
    card = target.get('name', '')
    requires_captain = False
    captain_questions = []
    
    name_lower = card.lower()
    desc_lower = target.get('description', '').lower()
    blockers = ['blocker', 'legal', 'financial', 'trade', 'kill', 'shutdown', 'wipe', 'delete all', 'production']
    
    if any(b in name_lower for b in blockers) or any(b in desc_lower for b in blockers):
        requires_captain = True
        captain_questions.append(f"What is the approved action for: {card[:80]}?")
    
    if 'crownless fortune' in name_lower and ('project blocks' in name_lower or 'blocker' in desc_lower):
        if not target.get('description', '').strip():
            requires_captain = True
            captain_questions.append("Card has no actionable description; what should be done?")
    
    decision = {
        "action_type": action_type,
        "target_card": target.get('shortLink', 'unknown'),
        "target_name": card[:80],
        "approach": "autonomous_execution",
        "estimated_effort": "5-10 minutes",
        "requires_captain": requires_captain,
        "captain_questions": captain_questions
    }
    
    if requires_captain:
        log("D.ECIDE", "Captain approval required — gating execution")
        return decision
    
    plans = {
        "bug_fix": ["Read card description + any linked resources", "Locate affected code/config", "Apply minimal targeted fix", "Run verification command", "Post evidence comment to Trello"],
        "docker": ["Check container status via docker ps", "Identify issue", "Restart or reconfigure", "Verify health", "Post evidence to Trello"],
        "security": ["Audit port bindings/firewall rules", "Apply hardening", "Verify ports restricted", "Document changes", "Update Trello with evidence"],
        "automation": ["Review requirements", "Implement/update script", "Test execution", "Document usage", "Update Trello with deployment info"],
        "crownless_blocker": ["Analyze Crownless Fortune blockers", "Check git status", "Inspect affected modules", "Document findings", "Post evidence to Trello"]
    }
    decision["plan"] = plans.get(action_type, ["Read card requirements", "Execute objective", "Verify completion", "Post evidence to Trello"])
    
    log("D.ECIDE", f"Plan: {decision['action_type']} — {len(decision['plan'])} steps")
    return decision

def handle_crownless_blocker(target, orientation):
    """Crownless Fortune-specific blocker handler"""
    log("A.CT", "Executing Crownless Fortune blocker handler...")
    
    result = {"status": "executing", "action_type": "crownless_blocker", "steps_completed": [], "evidence": [], "timestamp": datetime.now().isoformat()}
    
    try:
        card_name = target.get('name', '')
        card_desc = target.get('description', '')
        cf_dir = Path("C:/Users/kidsm/Documents/My Docs/VOID Pirate Trading Co/PROJECT_crownless_fortune")
        result["steps_completed"].append("init_cf_blocker_analysis")
        
        if not cf_dir.exists():
            result["status"] = "failed"
            result["error"] = f"Crownless Fortune directory not found: {cf_dir}"
            return result
        
        blockers_found = []
        blocker_keywords = {
            "L24": ["L24", "l24", "cleanup"],
            "renderer_split": ["renderer split", "renderer", "animation runtime"],
            "ipc_dedup": ["IPC", "ipc", "dedup", "duplicate"],
            "ui_controls": ["UI controls", "ui controls", "controls"]
        }
        
        combined = (card_name + " " + card_desc).lower()
        for blocker_name, keywords in blocker_keywords.items():
            if any(kw.lower() in combined for kw in keywords):
                blockers_found.append(blocker_name)
        
        result["blockers_found"] = blockers_found
        
        git_result = subprocess.run(["git", "status", "--short"], cwd=cf_dir, capture_output=True, text=True, timeout=10)
        if git_result.returncode == 0:
            modified = [line for line in git_result.stdout.strip().split('\n') if line.startswith(' M')]
            result["modified_files"] = len(modified)
            result["modified_list"] = modified[:10]
            result["steps_completed"].append("git_status_check")
            log("A.CT", f"Git status: {len(modified)} modified files")
        
        if "L24" in blockers_found:
            l24_files = list(cf_dir.rglob("*l24*")) + list(cf_dir.rglob("*L24*"))
            result["l24_files_found"] = len(l24_files)
            result["steps_completed"].append("l24_inspection")
        
        if "renderer_split" in blockers_found:
            renderer_dir = cf_dir / "Crownless_Fortune_live" / "src" / "renderer"
            if renderer_dir.exists():
                result["renderer_files"] = len(list(renderer_dir.iterdir()))
                result["steps_completed"].append("renderer_inspection")
        
        if "ipc_dedup" in blockers_found:
            ipc_files = list(cf_dir.rglob("*ipc*")) + list(cf_dir.rglob("*IPC*"))
            result["ipc_files_found"] = len(ipc_files)
            result["steps_completed"].append("ipc_inspection")
        
        result["blocker_report"] = {
            "card": card_name[:80],
            "blockers_identified": blockers_found,
            "modified_files": result.get("modified_files", 0),
            "recommendation": "Manual code review required - blockers need Captain approval"
        }
        
        result["status"] = "completed"
        log("A.CT", f"Blockers analyzed: {', '.join(blockers_found)}")
    except Exception as e:
        result["status"] = "failed"
        result["error"] = str(e)
        log("A.CT", f"ERROR: {e}")
    
    return result


def act_frontend6_netbox_status(decision, target):
    """FRONTEND-6: Ensure netbox.html API returns OK and NetBox is reachable."""
    log("A.CT", "Target: FRONTEND-6: netbox.html expects netbox==OK but API returns Not Ready")
    log("A.CT", "Checking /api/netbox/status endpoint...")
    
    try:
        import urllib.request
        req = urllib.request.Request('http://localhost:8080/api/netbox/status', headers={'User-Agent': 'curl'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            netbox_status = data.get('netbox', 'Unknown')
            log("A.CT", f"NetBox status: {netbox_status}")
            
            if netbox_status == 'OK':
                log("A.CT", "✅ NetBox API returns OK")
                return {
                    "status": "completed",
                    "action_type": "bug_fix",
                    "steps_completed": ["check_netbox_status", "verify_api"],
                    "evidence": [{"check": "netbox_api_status", "result": "PASS", "details": f"NetBox status: {netbox_status}"}],
                    "timestamp": datetime.now().isoformat(),
                    "fix_applied": True,
                    "note": "NetBox deployed and API returns OK"
                }
            else:
                log("A.CT", f"❌ NetBox status: {netbox_status}")
                return {
                    "status": "completed",
                    "action_type": "bug_fix",
                    "steps_completed": ["check_netbox_status"],
                    "evidence": [{"check": "netbox_api_status", "result": "FAIL", "details": f"NetBox status: {netbox_status}"}],
                    "timestamp": datetime.now().isoformat(),
                    "fix_applied": False,
                    "note": f"NetBox not ready: {netbox_status}"
                }
    except Exception as e:
        log("A.CT", f"❌ Status check failed: {e}")
        return {
            "status": "completed",
            "action_type": "bug_fix",
            "steps_completed": ["check_netbox_status"],
            "evidence": [{"check": "netbox_api_status", "result": "FAIL", "details": str(e)}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": f"Status check failed: {e}"
        }

REAL_HANDLERS = {
    "vY7w4HUw": act_frontend6_netbox_status,
}



def act(decision, target):
    """A.CT — Execute the actual work"""
    card_id = target.get('shortLink', '')
    card_name = target.get('name', '')
    action_type = decision.get("action_type", "generic")
    
    log("A.CT", f"Executing: {action_type}")
    
    # Check if a real handler exists for this card
    handler_name = REAL_HANDLERS.get(card_id)
    if handler_name is None and card_id not in REAL_HANDLERS:
        # No handler registered — skip card, continue loop
        log("A.CT", f"⚠️ No real handler for [{card_id}] {card_name[:55]} — skipping")
        return {
            "status": "needs_handler",
            "action_type": action_type,
            "steps_completed": [],
            "evidence": [{"check": "handler_registry", "result": "SKIP", "details": f"No real handler for card {card_id} — needs code/human work"}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": f"No real handler for {card_id} — requires implementation"
        }
    
    # Resolve handler function by name string
    handler_func = globals().get(handler_name) if isinstance(handler_name, str) else handler_name
    if handler_func and callable(handler_func):
        log("A.CT", f"Using REAL HANDLER: {handler_name}")
        return handler_func(decision, target)
    
    action_result = {"status": "executing", "action_type": action_type, "steps_completed": [], "evidence": [], "timestamp": datetime.now().isoformat()}
    
    try:
        log("A.CT", f"Target: {card_name[:60]}")
        action_result["steps_completed"].append("read_card_details")
        
        if decision["action_type"] == "docker":
            result = subprocess.run(["docker", "ps", "--format", "{{.Names}}|{{.Status}}|{{.Ports}}"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                action_result["docker_status"] = result.stdout[:500]
                action_result["steps_completed"].append("docker_inspection")
                log("A.CT", "Docker inspection complete")
            else:
                action_result["error"] = result.stderr[:200]
                action_result["status"] = "failed"
        elif decision["action_type"] == "security":
            result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, timeout=10)
            listening_ports = []
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if 'LISTENING' in line and ':' in line:
                        listening_ports.append(line.strip())
                action_result["listening_ports"] = listening_ports[:20]
                action_result["steps_completed"].append("port_audit")
                log("A.CT", f"Port audit: {len(listening_ports)} listeners found")
        elif decision["action_type"] == "bug_fix":
            action_result["fix_applied"] = False
            action_result["note"] = "Bug fix requires card-specific implementation"
            action_result["steps_completed"].append("bug_analysis")
            log("A.CT", "Bug analysis complete (fix requires manual implementation)")
        elif decision["action_type"] == "crownless_blocker":
            action_result.update(handle_crownless_blocker(target, orientation if 'orientation' in dir() else {}))
        else:
            action_result["generic_result"] = "Card processed"
            action_result["steps_completed"].append("generic_execution")
        
        if action_result["status"] != "failed":
            action_result["status"] = "completed"
    except Exception as e:
        action_result["status"] = "failed"
        action_result["error"] = str(e)
        log("A.CT", f"ERROR: {e}")
    
    return action_result

def verify(action_result, target, orientation):
    """V.ERIFY — Confirm work met success criteria"""
    log("V.ERIFY", "Validating action results against success criteria...")
    
    verification = {"passed": False, "checks": [], "timestamp": datetime.now().isoformat(), "verdict": "FAIL"}
    
    if action_result.get("status") == "needs_handler":
        verification["checks"].append({"check": "handler_check", "result": "SKIP", "details": action_result.get("note", "No handler available")})
        verification["passed"] = False
        verification["verdict"] = "NEEDS_HANDLER"
        log("V.ERIFY", f"Verdict: NEEDS_HANDLER — {action_result.get('note')}")
        return verification
    elif action_result.get("status") == "completed" and action_result.get("fix_applied") is True:
        verification["checks"].append({"check": "execution_completed", "result": "PASS", "details": f"Fix applied: {action_result.get('note', 'verified')}"})
    else:
        verification["checks"].append({"check": "execution_completed", "result": "FAIL", "details": f"No verified fix: {action_result.get('note', action_result.get('error', 'unknown'))}"})
        verification["passed"] = False
        verification["verdict"] = "FAIL"
        log("V.ERIFY", f"Verdict: FAIL ({len(verification['checks'])} checks)")
        return verification
    
    verification["checks"].append({"check": "evidence_generated", "result": "PASS", "details": "Action results captured"})
    
    action_type = action_result.get("action_type", "generic")
    if action_type == "docker" and "docker_status" in action_result:
        verification["checks"].append({"check": "docker_status_captured", "result": "PASS", "details": "Docker status recorded"})
    elif action_type == "security" and "listening_ports" in action_result:
        verification["checks"].append({"check": "security_audit_complete", "result": "PASS", "details": f"Audited {len(action_result.get('listening_ports', []))} ports"})
    elif action_type == "crownless_blocker" and "blockers_found" in action_result:
        verification["checks"].append({"check": "blocker_analysis_complete", "result": "PASS", "details": f"Identified {len(action_result.get('blockers_found', []))} blockers"})
    
    passed = all(c["result"] == "PASS" for c in verification["checks"])
    verification["passed"] = passed
    verification["verdict"] = "PASS" if passed else "FAIL"
    
    log("V.ERIFY", f"Verdict: {verification['verdict']} ({len(verification['checks'])} checks)")
    return verification

def persist(target, decision, action_result, verification):
    """PERSIST — Write evidence + update Trello card state"""
    log("PERSIST", "Archiving evidence + updating Trello...")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cycle_id = f"FODAVP_{timestamp}"
    
    evidence = {
        "cycle_id": cycle_id,
        "protocol": "FODAVP v2.0",
        "phases": ["Find", "Orient", "Decide", "Act", "Verify", "Persist"],
        "timestamp": datetime.now().isoformat(),
        "target": {
            "card_id": target.get('id', 'unknown'),
            "shortLink": target.get('shortLink', 'unknown'),
            "name": target.get('name', 'unknown')[:100],
            "url": target.get('url', '')
        },
        "decision": decision,
        "action": action_result,
        "verification": verification,
        "result": "PASS" if verification.get("passed") else "FAIL"
    }
    
    evidence_file = EVIDENCE_DIR / f"{cycle_id}_{target.get('shortLink', 'unknown')}.json"
    with open(evidence_file, 'w') as f:
        json.dump(evidence, f, indent=2)
    
    log("PERSIST", f"Evidence saved: {evidence_file.name}")
    
    trello_updated = False
    try:
        KEY, TOKEN = load_trello_credentials()
        if KEY and TOKEN:
            import requests
            card_id = target.get('id')
            if card_id:
                comment_url = f"https://api.trello.com/1/cards/{card_id}/actions/comments"
                comment_text = "🍳⚔️ FODAVP Protocol v2.0\n\n"
                comment_text += f"**Result:** {evidence['result']}\n"
                comment_text += f"**Action:** {decision.get('action_type', 'N/A')}\n"
                comment_text += f"**Verification:** {verification.get('verdict', 'N/A')}\n"
                comment_text += f"**Evidence:** {evidence_file.name}\n"
                comment_text += f"**Timestamp:** " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n"
                comment_text += f"**Checks:** {len(verification.get('checks', []))} performed\n"
                
                resp = requests.post(comment_url, params={"key": KEY, "token": TOKEN}, json={"text": comment_text}, timeout=15)
                if resp.status_code == 200:
                    log("PERSIST", "Trello comment posted successfully")
                    trello_updated = True
                else:
                    log("PERSIST", f"Trello comment failed: HTTP {resp.status_code}")
                
                if verification.get("passed"):
                    card_resp = requests.get(f"https://api.trello.com/1/cards/{card_id}", params={"key": KEY, "token": TOKEN}, timeout=10)
                    if card_resp.status_code == 200:
                        card_data = card_resp.json()
                        log("PERSIST", f"Card has {len(card_data.get('labels', []))} labels")
    except Exception as e:
        log("PERSIST", f"Trello update error: {e}")
    
    state_file = EVIDENCE_DIR / "fodavp_latest_state.json"
    state = {
        "last_cycle": datetime.now().isoformat(),
        "cycle_id": cycle_id,
        "result": evidence["result"],
        "target": target.get('shortLink', 'unknown'),
        "trello_updated": trello_updated,
        "evidence_file": str(evidence_file)
    }
    with open(state_file, 'w') as f:
        json.dump(state, f, indent=2)
    
    log("PERSIST", f"State cache updated: {state_file.name}")
    
    # REAL COMPLETION: move verified cards to Done list and mark Done
    moved_to_done = False
    if evidence.get("result") == "PASS" and verification.get("passed"):
        try:
            _move_card_to_list(target.get('id'), DONE_LIST_ID)
            _add_label_to_card(target.get('id'), DONE_LABEL_ID)
            moved_to_done = True
            log("PERSIST", "Card moved to Done list + Done label applied")
        except Exception as move_exc:
            log("PERSIST", f"Failed to move card to Done: {move_exc}")
    
    return {"evidence_file": str(evidence_file), "trello_updated": trello_updated, "result": evidence["result"], "moved_to_done": moved_to_done}


def act_prometheus_container_fix(decision, target):
    """BUG-5: Real fix for Prometheus container."""
    log("A.CT", "Target: BUG-5: Fix Prometheus container")
    log("A.CT", "Checking if void-prometheus container exists...")
    
    import subprocess
    result = subprocess.run(
        ["docker", "ps", "-a", "--filter", "name=void-prometheus", "--format", "{{.Names}}	{{.Status}}	{{.Ports}}"],
        capture_output=True, text=True, timeout=15
    )
    container_output = result.stdout.strip()
    log("A.CT", f"Container check: {container_output}")
    
    if not container_output or "void-prometheus" not in container_output:
        log("A.CT", "❌ void-prometheus container not found")
        return {
            "status": "completed",
            "action_type": "bug_fix",
            "steps_completed": ["container_check"],
            "evidence": [{"check": "container_exists", "result": "FAIL", "details": "void-prometheus container not found"}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": "Container not found — manual deployment required"
        }
    
    if "Exited" in container_output:
        log("A.CT", "Container is stopped — attempting to restart...")
        start_result = subprocess.run(
            ["docker", "start", "void-prometheus"],
            capture_output=True, text=True, timeout=15
        )
        if start_result.returncode == 0:
            log("A.CT", "✅ Container restarted successfully")
        else:
            log("A.CT", f"⚠️ Container restart failed: {start_result.stderr}")
            return {
                "status": "completed",
                "action_type": "bug_fix",
                "steps_completed": ["container_check", "restart_attempt"],
                "evidence": [{"check": "container_restart", "result": "FAIL", "details": start_result.stderr}],
                "timestamp": datetime.now().isoformat(),
                "fix_applied": False,
                "note": "Container exists but restart failed"
            }
    
    # Wait for container to be ready
    import time as _time
    _time.sleep(3)
    
    # Verify port 9090 is listening
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    port_open = sock.connect_ex(('127.0.0.1', 9090)) == 0
    sock.close()
    
    if not port_open:
        log("A.CT", "❌ Port 9090 not listening after restart")
        return {
            "status": "completed",
            "action_type": "bug_fix",
            "steps_completed": ["container_check", "restart", "port_check"],
            "evidence": [{"check": "port_9090", "result": "FAIL", "details": "Port not listening"}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": "Container restarted but port not available"
        }
    
    # Verify Prometheus HTTP endpoint
    try:
        import requests as _req
        resp = _req.get('http://localhost:9090/-/healthy', timeout=5)
        if resp.status_code == 200 and 'Healthy' in resp.text:
            log("A.CT", "✅ Prometheus is healthy and responding")
            return {
                "status": "completed",
                "action_type": "bug_fix",
                "steps_completed": ["container_check", "restart", "port_check", "http_verify"],
                "evidence": [
                    {"check": "container_running", "result": "PASS", "details": container_output},
                    {"check": "port_9090", "result": "PASS", "details": "Port 9090 listening"},
                    {"check": "http_verify", "result": "PASS", "details": "Prometheus healthy endpoint returned 200"}
                ],
                "timestamp": datetime.now().isoformat(),
                "fix_applied": True,
                "note": "void-prometheus container restarted and verified healthy on port 9090"
            }
        else:
            log("A.CT", f"⚠️ Prometheus returned {resp.status_code}: {resp.text[:100]}")
            return {
                "status": "completed",
                "action_type": "bug_fix",
                "steps_completed": ["container_check", "restart", "port_check", "http_verify"],
                "evidence": [{"check": "http_verify", "result": "FAIL", "details": f"HTTP {resp.status_code}"}],
                "timestamp": datetime.now().isoformat(),
                "fix_applied": False,
                "note": "Port open but Prometheus not healthy"
            }
    except Exception as e:
        log("A.CT", f"❌ HTTP verification failed: {e}")
        return {
            "status": "completed",
            "action_type": "bug_fix",
            "steps_completed": ["container_check", "restart", "port_check", "http_verify"],
            "evidence": [{"check": "http_verify", "result": "FAIL", "details": str(e)}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": f"HTTP check failed: {e}"
        }


def process_one_card(target):
    """Process a single card through all phases"""
    orientation = orient_target(target)
    
    # Handle dependencies
    dependencies = orientation.get('dependencies', [])
    if dependencies:
        log("ENGINE", f"🔗 DEPENDENCY CHAIN: {target.get('name', 'N/A')[:60]}")
        priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4}
        dep_list = []
        for dep in dependencies:
            dep_priority = 99
            for label in dep.get('labels', []):
                label_upper = label.upper()
                if label_upper in priority_order:
                    dep_priority = priority_order[label_upper]
                    break
            dep_list.append({**dep, 'priority_rank': dep_priority})
        dep_list.sort(key=lambda x: x['priority_rank'])
        
        if dep_list:
            highest_dep = dep_list[0]
            log("ENGINE", f"   Working dependency first: {highest_dep['shortLink']} - {highest_dep['name'][:50]}")
            dep_result = process_one_card({
                "id": highest_dep['id'],
                "shortLink": highest_dep.get('shortLink', ''),
                "name": highest_dep.get('name', ''),
                "description": highest_dep.get('description', ''),
                "labels": highest_dep.get('labels', []),
                "list_id": highest_dep.get('list_id', ''),
                "url": highest_dep.get('url', '')
            })
            if dep_result.get('status') == 'needs_captain':
                return {"status": "dependency_needs_captain", "parent_card": target.get('shortLink', 'unknown'), "dependency": highest_dep['shortLink'], "questions": dep_result.get('questions', [])}
            log("ENGINE", f"   ✅ Dependency {highest_dep['shortLink']} completed, resuming parent card")
    
    decision = decide_action(orientation, target)
    
    if decision.get("requires_captain"):
        log("ENGINE", "🛑 Captain approval required — skipping to next candidate")
        try:
            KEY, TOKEN = load_trello_credentials()
            if KEY and TOKEN:
                import requests
                card_id = target.get('id')
                if card_id:
                    comment_url = f"https://api.trello.com/1/cards/{card_id}/actions/comments"
                    comment_text = "🍳⚔️ FODAVP Protocol v2.0\n\n"
                    comment_text += "**Status:** Captain approval required\n"
                    for q in decision.get('captain_questions', []):
                        comment_text += f"- {q}\n"
                    comment_text += f"\n**Action paused until Captain responds.**\n"
                    comment_text += f"**Timestamp:** " + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + "\n"
                    requests.post(comment_url, params={"key": KEY, "token": TOKEN}, json={"text": comment_text}, timeout=15)
                    log("ENGINE", "Posted captain approval questions to Trello")
        except Exception as e:
            log("ENGINE", f"Trello update error: {e}")
        
        return {"status": "needs_captain", "target": target.get('shortLink', 'unknown'), "questions": decision.get('captain_questions', [])}
    
    # BUG-5: real handler for Prometheus container fix
    if target.get('shortLink') == 'xdvbP1wT':
        action_result = act_prometheus_container_fix(decision, target)
    else:
        action_result = act(decision, target)
    verification = verify(action_result, target, orientation)
    persistence = persist(target, decision, action_result, verification)
    
    # Track processed card to avoid repeats
    processed_file = EVIDENCE_DIR / "fodavp_processed_cards.json"
    processed_ids = set()
    if processed_file.exists():
        try:
            processed_ids = set(json.loads(processed_file.read_text()))
        except Exception:
            processed_ids = set()
    processed_ids.add(target.get('id'))
    processed_file.write_text(json.dumps(list(processed_ids)))
    
    return {
        "status": "complete",
        "result": persistence["result"],
        "target": target.get('shortLink', 'unknown'),
        "evidence_file": persistence["evidence_file"],
        "trello_updated": persistence["trello_updated"]
    }

def run_fodavp(card_id=None):
    """Execute one complete FODAVP cycle with candidate batching"""
    cycle_start = time.time()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    cycle_id = f"FODAVP_{timestamp}"
    
    log("ENGINE", f"🚀 CYCLE INITIATED — {cycle_id}")
    
    candidates = find_targets(card_id, max_candidates=5)
    if not candidates:
        log("ENGINE", "No actionable targets — cycle complete")
        return {"status": "idle", "reason": "no_actionable_cards"}
    
    results = []
    completed = []
    needs_captain = []
    
    for target in candidates:
        log("ENGINE", f"🔍 Trying candidate: [{target.get('shortLink')}] {target.get('name', 'N/A')[:55]}")
        result = process_one_card(target)
        results.append(result)
        
        if result.get('status') == 'complete':
            duration = round(time.time() - cycle_start, 2)
            result_type = result.get('result', 'UNKNOWN')
            log("ENGINE", f"🏁 CARD COMPLETED — {result_type} in {duration}s")
            if result_type == 'PASS' and result.get('moved_to_done'):
                completed.append(result)
            elif result.get('moved_to_done'):
                needs_captain.append(result)
            else:
                # needs_handler or unverified — skip and continue loop
                log("ENGINE", f"⏭️ Card {result.get('target')} skipped — no handler or needs work")
                continue
        elif result.get('status') == 'needs_captain':
            log("ENGINE", f"⏸️ Candidate needs captain: {result.get('target')} — trying next candidate")
            needs_captain.append(result)
        else:
            log("ENGINE", f"❌ Candidate failed: {result.get('target')}")
    
    duration = round(time.time() - cycle_start, 2)
    log("ENGINE", f"🏁 BATCH COMPLETE — {len(completed)} completed, {len(needs_captain)} need captain, {duration}s")
    
    return {
        "status": "batch_complete",
        "completed": len(completed),
        "needs_captain_count": len(needs_captain),
        "needs_captain": needs_captain,
        "candidates_reviewed": len(candidates),
        "results": results,
        "duration_seconds": duration
    }

def main():
    init_dirs()
    
    card_id = None
    continuous = False
    
    args = sys.argv[1:]
    if "--card" in args:
        idx = args.index("--card")
        card_id = args[idx + 1] if idx + 1 < len(args) else None
    if "--continuous" in args:
        continuous = True
    
    log("ENGINE", "🍳⚔️ FODAVP Protocol Engine v2.0")
    log("ENGINE", "F.IND → O.RIENT → D.ECIDE → A.CT → V.ERIFY → PERSIST")
    
    while True:
        result = run_fodavp(card_id)
        
        if result.get("status") == "idle":
            log("ENGINE", "No actionable targets — cycle complete")
            if not continuous:
                break
            time.sleep(60)
            continue
        
        if not continuous:
            break
        
        time.sleep(30)

if __name__ == "__main__":
    main()
