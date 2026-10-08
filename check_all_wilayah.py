import sys
sys.path.insert(0, 'backend')
from app.core.database import engine
engine.echo=False
from app.main import app
from fastapi.testclient import TestClient
c=TestClient(app)
names=["Kota Semarang","Kabupaten Kendal","Kabupaten Cilacap","Kabupaten Banyumas","Kota Surakarta","Kabupaten Klaten","Kabupaten Brebes","Kabupaten Tegal","Kota Tegal","Kabupaten Boyolali"]
for nm in names:
    r=c.get('/api/wilayah-rincian', params={'nama':nm})
    j=r.json() if r.status_code==200 else None
    print(nm, r.status_code, "synthetic" if j and j.get('wilayah',{}).get('synthetic') else "real" if r.status_code==200 else r.text[:120], "ada", j['jumlah_partai_ada'] if j else "", "peran", j['peran']['enum_pendukung']+"/"+j['peran']['enum_penggerak']+"/"+j['peran']['enum_pelopor'] if j else "")
# also test without nama -> should 404
r=c.get('/api/wilayah-rincian')
print("no param", r.status_code, r.text[:200])
