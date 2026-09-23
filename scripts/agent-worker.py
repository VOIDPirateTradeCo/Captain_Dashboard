#!/usr/bin/env python3
"""
agent-worker.py — Mission Control agent worker.

Runs on each fleet PC. Polls MC for assigned tasks, executes them via the
local agent runtime (Hermes/Claude/Codex), posts evidence, and completes.

Usage:
  python agent-worker.py --agent sir-green --once    (single poll, then exit)
  python agent-worker.py --agent sir-green            (continuous loop)

Environment (via .env next to this script or system env):
  MC_URL          — MC base URL (default http://localhost:3100)
  MC_API_KEY      — MC API_KEY env value
  AGENT_RUNTIME   — hermes | claude | codex
  HERMES_URL      — Hermes gateway URL (default http://localhost:8645/v1)
  MODEL           — model name for fallback (default google/gemini-2.0-flash-001)
"""
import argparse, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

DEFAULTS = {
    "mc_url": "http://localhost:3100",
    "hermes_url": "http://localhost:8645/v1",
    "model": "google/gemini-2.0-flash-001",
    "poll_interval": 30,
}

def load_env():
    env = {}
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    for k, default in DEFAULTS.items():
        env[k.upper()] = os.environ.get(k.upper(), env.get(k.upper(), default))
    env["MC_API_KEY"] = os.environ.get("MC_API_KEY", env.get("MC_API_KEY", ""))
    env["AGENT_RUNTIME"] = os.environ.get("AGENT_RUNTIME", env.get("AGENT_RUNTIME", "hermes"))
    return env

def mc_request(method, path, body=None, env=None):
    url = f"{env['MC_URL']}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("x-api-key", env["MC_API_KEY"])
    req.add_header("x-agent-name", env["AGENT_NAME"])
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode() if e.fp else ""
        return {"error": f"HTTP {e.code}: {body_text}"}
    except Exception as e:
        return {"error": str(e)}

def execute_via_hermes(task, env):
    """Execute task via local Hermes proxy (OpenAI-compatible)."""
    prompt = f"""You are working on a Mission Control task.

Task: {task.get('title', '')}
Description: {task.get('description', '')}
Priority: {task.get('priority', 'medium')}

Provide a concise update. If the task can be fully addressed, end with:
COMPLETE: <resolution summary>

If more work is needed, provide your progress update."""
    
    body = {
        "model": env["MODEL"],
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 2048,
    }
    url = f"{env['HERMES_URL']}/chat/completions"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            r = json.loads(resp.read())
            text = r.get("choices", [{}])[0].get("message", {}).get("content", "")
            return text
    except Exception as e:
        return f"ERROR: Hermes execution failed: {e}"

def execute_via_claude(task, env):
    """Execute via local Claude (placeholder — needs Claude CLI integration)."""
    return f"[CLAUDE PLACEHOLDER] Task '{task.get('title','')}' queued for Claude processing."

def execute_via_codex(task, env):
    """Execute via local Codex (placeholder)."""
    return f"[CODEX PLACEHOLDER] Task '{task.get('title','')}' queued for Codex processing."

EXECUTORS = {
    "hermes": execute_via_hermes,
    "claude": execute_via_claude,
    "codex": execute_via_codex,
}

def poll_and_work(env):
    """Single poll cycle: get tasks, claim one, execute, post evidence, complete."""
    # Get tasks for this agent
    resp = mc_request("GET", f"/api/agent-tasks?name={env['AGENT_NAME']}&limit=10", env=env)
    
    if "error" in resp:
        print(f"Poll error: {resp['error']}")
        return False
    
    tasks = resp.get("tasks", [])
    assigned = [t for t in tasks if t["status"] == "assigned"]
    inbox = [t for t in tasks if t["status"] == "inbox"]
    
    print(f"[{env['AGENT_NAME']}] Poll: {len(assigned)} assigned, {len(inbox)} inbox")
    
    # Work on first assigned task
    for task in assigned:
        tid = task["id"]
        print(f"  Working on #{tid}: {task['title'][:50]}...")
        
        # Execute via runtime
        executor = EXECUTORS.get(env["AGENT_RUNTIME"], execute_via_hermes)
        result = executor(task, env)
        
        # Post evidence
        evidence_resp = mc_request("POST", f"/api/tasks/{tid}/evidence", {"content": result}, env=env)
        if "error" in evidence_resp:
            print(f"    Evidence post failed: {evidence_resp['error']}")
            continue
        print(f"    Evidence posted: {len(result)} chars")
        
        # Complete if result says COMPLETE or task is simple
        complete = "COMPLETE:" in result.upper() or task.get("priority") == "low"
        if complete:
            # Extract resolution
            resolution = result
            for line in result.split("\n"):
                if line.upper().startswith("COMPLETE:"):
                    resolution = line[9:].strip()
                    break
            complete_resp = mc_request("POST", f"/api/tasks/{tid}/complete", {
                "outcome": "completed",
                "resolution": resolution,
            }, env=env)
            if "error" in complete_resp:
                print(f"    Complete failed: {complete_resp['error']}")
            else:
                print(f"    Task #{tid} completed!")
        return True
    
    # If no assigned task, claim an inbox task
    if inbox:
        task = inbox[0]
        tid = task["id"]
        print(f"  Claiming inbox #{tid}: {task['title'][:50]}...")
        claim_resp = mc_request("POST", f"/api/tasks/{tid}/claim", None, env=env)
        if "error" in claim_resp:
            print(f"    Claim failed: {claim_resp['error']}")
        else:
            print(f"    Claimed!")
        return True
    
    return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True, help="Agent name (e.g. sir-green)")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()
    
    env = load_env()
    env["AGENT_NAME"] = args.agent
    
    if not env["MC_API_KEY"]:
        print("ERROR: MC_API_KEY not set")
        sys.exit(1)
    
    print(f"Agent Worker: {args.agent} (runtime={env['AGENT_RUNTIME']})")
    print(f"MC: {env['MC_URL']}")
    
    if args.once:
        poll_and_work(env)
        return
    
    print(f"Polling every {env['poll_interval']}s...")
    while True:
        try:
            poll_and_work(env)
        except Exception as e:
            print(f"Error in poll: {e}")
        time.sleep(int(env["POLL_INTERVAL"]))

if __name__ == "__main__":
    main()
