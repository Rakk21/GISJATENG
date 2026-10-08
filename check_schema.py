import sys
sys.path.insert(0,'backend')
from sqlalchemy import text
from app.core.database import engine, SessionLocal
engine.echo=False
db=SessionLocal()
try:
    for tbl in ["komunitas_senam","tokoh_partai","wilayah","anggota_partai","partai"]:
        try:
            cols=db.execute(text(f"SELECT column_name,data_type FROM information_schema.columns WHERE table_name='{tbl}' ORDER BY ordinal_position")).fetchall()
            print("==",tbl)
            for c in cols: print(" ",c)
            # sample rows
            rows=db.execute(text(f'SELECT * FROM {tbl} LIMIT 5')).fetchall()
            for r in rows: print("  row",r)
        except Exception as e:
            print(tbl,"err",e); db.rollback()
finally:
    db.close()
