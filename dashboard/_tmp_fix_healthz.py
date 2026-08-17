from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
old = "                sys.stderr.write('HEALTHZ ERROR: ' + traceback.format_exc() + '\"\n\"')\n                sys.stderr.flush()\n"
new = "                sys.stderr.write('HEALTHZ ERROR: ' + traceback.format_exc() + chr(10))\n                sys.stderr.flush()\n"
if old not in text:
    raise SystemExit('old block not found')
p.write_text(text.replace(old, new), encoding='utf-8')
print('fixed healthz fallback write')
