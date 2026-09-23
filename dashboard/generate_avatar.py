#!/usr/bin/env python3
"""
generate_avatar.py — Render a pirate persona avatar via Sir Azure's ComfyUI (SDXL).
Offline / local. Builds a proper ComfyUI API workflow graph, queues it, polls
history, downloads the PNG, saves to personas/avatars/, and updates crew_registry.json.

Usage:
  python generate_avatar.py --who captain
  python generate_avatar.py --who all
Env / defaults:
  COMFYUI_URL  (default http://192.168.0.32:8188)
  CHECKPOINT   (default sd_xl_base_1.0.safetensors — must exist in Sir Azure's ComfyUI)
"""
import argparse, json, os, sys, time, urllib.request as u, urllib.error as ue

HERE = os.path.dirname(os.path.abspath(__file__))
REG_PATH = os.path.join(HERE, "crew_registry.json")
AVATAR_DIR = os.path.join(HERE, "personas", "avatars")
COMFYUI = os.environ.get("COMFYUI_URL", "http://192.168.0.32:8188")
CHECKPOINT = os.environ.get("CHECKPOINT", "sd_xl_base_1.0.safetensors")

def load_reg():
    with open(REG_PATH, encoding="utf-8") as f:
        return json.load(f)

def comfy_get(path):
    with u.urlopen(f"{COMFYUI}{path}", timeout=10) as r:
        return json.loads(r.read())

def comfy_post(path, payload):
    data = json.dumps(payload).encode()
    req = u.Request(f"{COMFYUI}{path}", data=data,
                    headers={"Content-Type": "application/json"}, method="POST")
    with u.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

def build_workflow(prompt, neg="blurry, low quality, deformed"):
    """Proper ComfyUI API-format graph for SDXL txt2img."""
    return {
        "3": {"class_type": "CheckpointLoaderSimple",
              "inputs": {"ckpt_name": CHECKPOINT}},
        "6": {"class_type": "CLIPTextEncode",
              "inputs": {"text": prompt, "clip": ["3", 1]}},
        "7": {"class_type": "CLIPTextEncode",
              "inputs": {"text": neg, "clip": ["3", 1]}},
        "5": {"class_type": "EmptyLatentImage",
              "inputs": {"width": 512, "height": 512, "batch_size": 1}},
        "4": {"class_type": "KSampler",
              "inputs": {"seed": int(time.time()) % 1000000, "steps": 25, "cfg": 7.0,
                         "sampler_name": "dpmpp_2m", "scheduler": "karras",
                         "denoise": 1.0, "model": ["3", 0], "positive": ["6", 0],
                         "negative": ["7", 0], "latent_image": ["5", 0]}},
        "8": {"class_type": "VAEDecode",
              "inputs": {"samples": ["4", 0], "vae": ["3", 2]}},
        "9": {"class_type": "SaveImage",
              "inputs": {"images": ["8", 0], "filename_prefix": "pirate_avatar"}},
    }

def has_checkpoint():
    try:
        info = comfy_get(f"/object_info/CheckpointLoaderSimple")
        opts = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
        return CHECKPOINT in opts
    except Exception:
        return False

def render(who, prompt):
    os.makedirs(AVATAR_DIR, exist_ok=True)
    wf = build_workflow(prompt)
    try:
        resp = comfy_post("/prompt", {"prompt": wf, "client_id": "sir_green_dash"})
    except ue.HTTPError as e:
        return False, f"ComfyUI rejected workflow: {e.code} {e.read().decode()[:160]}"
    pid = resp.get("prompt_id")
    if not pid:
        return False, f"no prompt_id: {resp}"
    # poll history
    for _ in range(60):
        try:
            hist = comfy_get(f"/history/{pid}")
            if pid in hist:
                outs = hist[pid]["outputs"]
                for node in outs.values():
                    for img in node.get("images", []):
                        fn = img["filename"]
                        with u.urlopen(f"{COMFYUI}/view?filename={fn}&subfolder=&type=output", timeout=20) as r:
                            data = r.read()
                        out = os.path.join(AVATAR_DIR, f"{who}.png")
                        with open(out, "wb") as f:
                            f.write(data)
                        return True, out
        except Exception:
            pass
        time.sleep(3)
    return False, "timeout waiting for render"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--who", default="all")
    a = ap.parse_args()
    reg = load_reg()
    persons = reg.get("personas", {})
    targets = list(persons.keys()) if a.who == "all" else [a.who]
    if not has_checkpoint():
        print(f"WARN: checkpoint '{CHECKPOINT}' not loaded on Sir Azure ComfyUI "
              f"({COMFYUI}). Avatar render blocked until SDXL checkpoint is mounted.")
        print("Set CHECKPOINT env to a loaded model, or load sd_xl_base_1.0.safetensors in ComfyUI.")
        sys.exit(2)
    for who in targets:
        p = persons.get(who, {})
        prompt = p.get("avatar_prompt", f"pirate crew portrait of {who}, digital painting")
        print(f"Rendering {who}...")
        ok, msg = render(who, prompt)
        if ok:
            p["avatar_status"] = "rendered"
            p["avatar_path"] = os.path.relpath(msg, HERE)
            print(f"  OK -> {msg}")
        else:
            p["avatar_status"] = "render_failed"
            print(f"  FAIL: {msg}")
    with open(REG_PATH, "w", encoding="utf-8") as f:
        json.dump(reg, f, indent=2)
    print("Registry updated.")

if __name__ == "__main__":
    main()
