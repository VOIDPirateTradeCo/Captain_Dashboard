from pathlib import Path
p = Path('dashboard_server.py')
lines = p.read_text(encoding='utf-8').splitlines()
old = "        sys.stderr.write('[FATAL] ' + repr(e) + '\\n')"
new = "        sys.stderr.write('[FATAL] ' + repr(e) + chr(10))"
for i, line in enumerate(lines):
    if line == old:
        lines[i] = new
        break
p.write_text('\n'.join(lines), encoding='utf-8')
print('patched fatal newline with chr(10)')
