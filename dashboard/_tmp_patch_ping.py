from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
old = 'def ping_fast(host, count=1, timeout=3):\n    """Fast ping to measure latency."""\n    try:\n        result = subprocess.run(\n            [\'ping\', \'-n\', str(count), host],\n            capture_output=True, text=True, timeout=timeout\n        )\n        if result.returncode == 0:\n            match = re.search(r\'(?:Average|time)[=\\s:]+(\\d+)ms\', result.stdout, re.IGNORECASE)\n            if match:\n                return match.group(1) + "ms"\n            return "up"\n        return "down"\n    except:\n        return "down"\n'
new = 'def ping_fast(host, count=1, timeout=3):\n    """Fast ping to measure latency."""\n    try:\n        result = subprocess.run(\n            [\'ping\', \'-n\', str(count), host],\n            capture_output=True, text=True, timeout=timeout\n        )\n        if result.returncode == 0:\n            m = re.search(r\'Average\\s*=?\\s*(\\d+)ms\', result.stdout, re.IGNORECASE)\n            if not m:\n                m = re.search(r\'Minimum\\s*=?\\s*(\\d+)ms\', result.stdout, re.IGNORECASE)\n            if not m:\n                m = re.search(r\'time[<=]\\s*(\\d+)ms\', result.stdout, re.IGNORECASE)\n            if m:\n                return m.group(1) + "ms"\n            return "—"\n        return "—"\n    except Exception:\n        return "—"\n'
if old not in text:
    raise SystemExit('old block not found')
p.write_text(text.replace(old, new), encoding='utf-8')
print('patched ping_fast')
