from pathlib import Path
p = Path('dashboard_server.py')
text = p.read_text(encoding='utf-8')
old = '''def cache_get(key):
    """Get cached data if not expired."""
    with _cache_lock:
        if key in _CACHE:
            data, timestamp = _CACHE[key]
            if (datetime.datetime.now(datetime.timezone.utc) - timestamp).total_seconds() < CACHE_TIMEOUT:
                return data
    return None'''
new = '''def cache_get(key):
    """Get cached data if not expired."""
    with _cache_lock:
        if key in _CACHE:
            data, timestamp = _CACHE[key]
            if isinstance(timestamp, str):
                try:
                    timestamp = datetime.datetime.fromisoformat(timestamp)
                except Exception:
                    return None
            if timestamp is not None and (datetime.datetime.now(datetime.timezone.utc) - timestamp).total_seconds() < CACHE_TIMEOUT:
                return data
    return None'''
if old not in text:
    raise SystemExit('cache_get block not found')
p.write_text(text.replace(old, new), encoding='utf-8')
print('patched cache_get')
