from pathlib import Path

text = Path("fodavp_engine.py").read_text()

# 1. Add REAL_HANDLERS registry + handler lookup inside act()
old1 = '''def act(decision, target):
    """A.CT — Execute the actual work"""
    log("A.CT", f"Executing: {decision['action_type']}")
    
    action_result = {"status": "executing", "action_type": decision["action_type"], "steps_completed": [], "evidence": [], "timestamp": datetime.now().isoformat()}
    
    try:
        log("A.CT", f"Target: {target.get('name', 'N/A')[:60]}")
        action_result["steps_completed"].append("read_card_details")
        
        if decision["action_type"] == "docker":'''

new1 = '''REAL_HANDLERS = {}

def act(decision, target):
    """A.CT — Execute the actual work"""
    card_id = target.get('shortLink', '')
    card_name = target.get('name', '')
    action_type = decision.get("action_type", "generic")
    
    log("A.CT", f"Executing: {action_type}")
    
    # Check if a real handler exists for this card
    handler = REAL_HANDLERS.get(card_id)
    if handler is None and card_id not in REAL_HANDLERS:
        # No handler registered — mark as needs_handler, do NOT fake PASS
        log("A.CT", f"⚠️ No real handler for [{card_id}] {card_name[:55]}")
        return {
            "status": "completed",
            "action_type": action_type,
            "steps_completed": ["no_handler_available"],
            "evidence": [{"check": "handler_registry", "result": "SKIP", "details": f"No real handler for card {card_id} — needs code/human work"}],
            "timestamp": datetime.now().isoformat(),
            "fix_applied": False,
            "note": f"No real handler for {card_id} — requires implementation"
        }
    
    action_result = {"status": "executing", "action_type": action_type, "steps_completed": [], "evidence": [], "timestamp": datetime.now().isoformat()}
    
    try:
        log("A.CT", f"Target: {card_name[:60]}")
        action_result["steps_completed"].append("read_card_details")
        
        if decision["action_type"] == "docker":'''

text = text.replace(old1, new1)

# 2. Fix verify() to check fix_applied, not just execution
old2 = '''    if action_result.get("status") == "completed":
        verification["checks"].append({"check": "execution_completed", "result": "PASS", "details": "Action executed without errors"})
    else:
        verification["checks"].append({"check": "execution_completed", "result": "FAIL", "details": action_result.get("error", "Unknown error")})
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
    verification["verdict"] = "PASS" if passed else "FAIL"'''

new2 = '''    if action_result.get("status") == "completed" and action_result.get("fix_applied", False):
        verification["checks"].append({"check": "execution_completed", "result": "PASS", "details": f"Fix applied: {action_result.get('note', 'verified')}"})
    elif action_result.get("status") == "completed" and not action_result.get("fix_applied", False):
        verification["checks"].append({"check": "execution_completed", "result": "FAIL", "details": f"No fix applied: {action_result.get('note', 'unknown')}"})
        verification["passed"] = False
        verification["verdict"] = "FAIL"
        log("V.ERIFY", f"Verdict: FAIL ({len(verification['checks'])} checks)")
        return verification
    else:
        verification["checks"].append({"check": "execution_completed", "result": "FAIL", "details": action_result.get("error", "Unknown error")})
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
    verification["verdict"] = "PASS" if passed else "FAIL"'''

text = text.replace(old2, new2)

# 3. Make persist() respect verification failure
old3 = '''    # REAL COMPLETION: move verified cards to Done list and mark Done
    moved_to_done = False
    if evidence.get("result") == "PASS" and verification.get("passed"):
        try:
            _move_card_to_list(target.get('id'), DONE_LIST_ID)
            _add_label_to_card(target.get('id'), DONE_LABEL_ID)
            moved_to_done = True
            log("PERSIST", "Card moved to Done list + Done label applied")
        except Exception as move_exc:
            log("PERSIST", f"Failed to move card to Done: {move_exc}")
    
    log("PERSIST", f"State cache updated: {state_file.name}")
    return {"evidence_file": str(evidence_file), "trello_updated": trello_updated, "result": evidence["result"], "moved_to_done": moved_to_done}'''

new3 = '''    # Only move to Done if verification actually passed
    moved_to_done = False
    if verification.get("passed"):
        try:
            _move_card_to_list(target.get('id'), DONE_LIST_ID)
            _add_label_to_card(target.get('id'), DONE_LABEL_ID)
            moved_to_done = True
            log("PERSIST", "Card moved to Done list + Done label applied")
        except Exception as move_exc:
            log("PERSIST", f"Failed to move card to Done: {move_exc}")
    else:
        log("PERSIST", f"⚠️ Card NOT moved to Done — verification failed: {verification.get('verdict')}")
    
    log("PERSIST", f"State cache updated: {state_file.name}")
    return {"evidence_file": str(evidence_file), "trello_updated": trello_updated, "result": evidence["result"], "moved_to_done": moved_to_done}'''

text = text.replace(old3, new3)

# 4. Update run_fodavp to distinguish real PASS from needs-work
old4 = '''        if result.get('status') == 'complete':
            duration = round(time.time() - cycle_start, 2)
            log("ENGINE", f"🏁 CARD COMPLETED — {result.get('result')} in {duration}s")
            completed.append(result)'''

new4 = '''        if result.get('status') == 'complete':
            duration = round(time.time() - cycle_start, 2)
            result_type = result.get('result', 'UNKNOWN')
            log("ENGINE", f"🏁 CARD COMPLETED — {result_type} in {duration}s")
            if result_type == 'PASS' and result.get('moved_to_done'):
                completed.append(result)
            elif result_type == 'PASS' and not result.get('moved_to_done'):
                needs_captain.append(result)
                log("ENGINE", f"⚠️ Card {result.get('target')} needs human/code work")
            else:
                needs_captain.append(result)'''

text = text.replace(old4, new4)

Path("fodavp_engine.py").write_text(text)
print("✅ All patches applied")
