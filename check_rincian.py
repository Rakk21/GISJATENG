import sys
sys.path.insert(0,'backend')
try:
    from app.main import app
    print("routes ok")
    from fastapi.testclient import TestClient
    c=TestClient(app)
    r=c.get("/api/wilayah-rincian", params={"nama":"Kota Semarang"})
    print("status",r.status_code)
    print(r.text[:3000])
except Exception as e:
    import traceback; traceback.print_exc()
