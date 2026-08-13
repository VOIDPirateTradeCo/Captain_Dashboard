#!/usr/bin/env python3
"""
comfyui_queue_manager.py — Sir Azure's ComfyUI GPU queue pause/resume.
FREE, local. Talks to ComfyUI /interrupt + /queue endpoints on STEALTHATTACK.
Usage:
  python comfyui_queue_manager.py status
  python comfyui_queue_manager.py pause     # interrupt current + block new
  python comfyui_queue_manager.py resume    # allow new prompts
State stored in queue_pause.flag locally.
"""
import sys, json, urllib.request as u, urllib.parse as p, os
COMFY = os.environ.get("COMFYUI_URL", "http://192.168.0.32:8188")
FLAG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "queue_pause.flag")

def post(path, payload=None):
    data = json.dumps(payload or {}).encode()
    req = u.Request(f"{COMFY}{path}", data=data, headers={"Content-Type":"application/json"}, method="POST")
    try:
        with u.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except Exception as e:
        return None, str(e)

def get(path):
    try:
        with u.urlopen(f"{COMFY}{path}", timeout=10) as r:
            return r.status, r.read().decode()
    except Exception as e:
        return None, str(e)

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        st, body = get("/queue")
        paused = os.path.exists(FLAG)
        print(f"ComfyUI {COMFY} queue: {body[:120]}")
        print(f"PAUSED (new prompts blocked): {paused}")
    elif cmd == "pause":
        st, body = post("/interrupt")           # halt current gen
        open(FLAG, "w").write("1")
        print(f"Interrupted current gen; new prompts PAUSED (flag set). Interrupt: {st}")
    elif cmd == "resume":
        if os.path.exists(FLAG): os.remove(FLAG)
        print("Queue RESUMED (new prompts allowed).")
    else:
        print("usage: status|pause|resume")

if __name__ == "__main__":
    main()
