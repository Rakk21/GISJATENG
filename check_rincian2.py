import sys
sys.path.insert(0,'backend')
# disable echo by patching before import
import app.core.database as dbmod
dbmod.engine.echo=False
# need to re-create engine with echo False? patch already set? just set attribute
from app.core.database import engine
engine.echo=False
from app.main import app
from fastapi.testclient import TestClient
c=TestClient(app)
for nama in ["Kota Semarang","Kabupaten Kendal","Kota Semarang-notfound"]:
    r=c.get('/api/wilayah-rincian', params={'nama':nama})
    print("===" ,nama, "status",r.status_code)
    if r.status_code==200:
        j=r.json()
        print(" wilayah",j['wilayah'])
        print(" total_partai",j['total_partai'],"ada",j['jumlah_partai_ada'])
        print(" peran",j['peran'])
        print(" kades",j['kepala_desa'])
        print(" senam",j['komunitas_senam'])
        print(" tokoh total",j['tokoh_partai']['total_tokoh'], "daftar",j['tokoh_partai']['daftar'][:2])
        print(" partai",j['partai'][:2])
    else:
        print(r.text[:500])
# also test wilayah_id
r=c.get('/api/wilayah-rincian', params={'wilayah_id':2})
print("=== wilayah_id 2", r.status_code, r.json()['wilayah'] if r.status_code==200 else r.text[:300])
