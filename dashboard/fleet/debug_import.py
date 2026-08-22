import sys, time, signal

class ImportTracer:
    def find_module(self, fullname, path=None):
        return self
    def load_module(self, fullname):
        t0 = time.time()
        try:
            __import__(fullname)
            print(f"[OK] {fullname} in {time.time()-t0:.2f}s")
        except Exception as e:
            print(f"[FAIL] {fullname}: {e}")
        return sys.modules.get(fullname)

sys.path.insert(0, '/app/backend')
sys.meta_path.insert(0, ImportTracer())
print("Starting import trace...")
import app
print("Import completed")
