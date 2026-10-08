import sys
sys.path.insert(0, 'backend')
from app.core.database import engine
engine.echo=False
from app.main import app
from fastapi.testclient import TestClient
c=TestClient(app)
for params in [
    {"kab_kota":"Kota Semarang"},
    {"kab_kota":["Kota Semarang","Kabupaten Kendal"]},
    {"kode_kk":"33.74"},
    {},
    {"kab_kota":"Kabupaten Cilacap"},
]:
    if isinstance(params.get("kab_kota"), list):
        qs="&".join(f"kab_kota={v}" for v in params["kab_kota"])
        r=c.get(f"/api/geo/kecamatan?{qs}")
    elif "kab_kota" in params:
        r=c.get("/api/geo/kecamatan", params=params)
    elif "kode_kk" in params:
        r=c.get("/api/geo/kecamatan", params=params)
    else:
        r=c.get("/api/geo/kecamatan")
    print("params",params,"status",r.status_code)
    if r.status_code==200:
        j=r.json()
        print(" features",len(j.get("features",[])), "sample",j["features"][0]["properties"] if j["features"] else "empty")
    else:
        print(r.text[:400])
