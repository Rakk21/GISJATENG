import sys
sys.path.insert(0, 'backend')
from sqlalchemy import text
from app.core.database import engine, SessionLocal
engine.echo=False
db=SessionLocal()
try:
    print("wilayah", db.execute(text("SELECT count(*) FROM wilayah")).scalar())
    print("wilayah sample", db.execute(text("SELECT id,nama,tingkat,kode_kemendagri FROM wilayah ORDER BY id LIMIT 8")).fetchall())
    print("partai", db.execute(text("SELECT id,nama,slug FROM partai LIMIT 8")).fetchall())
    print("anggota_partai count", db.execute(text("SELECT count(*) FROM anggota_partai")).scalar())
    print("anggota sample", db.execute(text("SELECT wilayah_id,partai_id,jumlah_pendukung,jumlah_penggerak,jumlah_pelopor FROM anggota_partai LIMIT 5")).fetchall())
    print("dapil", db.execute(text("SELECT id,kode,nama,jenis,tahun FROM dapil LIMIT 10")).fetchall())
    print("dapil_wilayah count", db.execute(text("SELECT count(*) FROM dapil_wilayah")).scalar())
    for t in ["wilayah_profil","komunitas_senam","tokoh_partai"]:
        try:
            n=db.execute(text(f"SELECT count(*) FROM {t}")).scalar()
            print(t, n)
        except Exception as e:
            print(t, "not exists:", e)
            db.rollback()
finally:
    db.close()
