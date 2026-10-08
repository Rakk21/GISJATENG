import sys
sys.path.insert(0,'backend')
from sqlalchemy import text
from app.core.database import engine, SessionLocal
engine.echo=False
db=SessionLocal()
try:
    tables=db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).fetchall()
    print([t[0] for t in tables])
    for tbl in [t[0] for t in tables]:
        if tbl.startswith('alembic'): continue
        cols=db.execute(text(f"SELECT column_name,data_type FROM information_schema.columns WHERE table_name='{tbl}' ORDER BY ordinal_position")).fetchall()
        print("==",tbl, cols)
        try:
            cnt=db.execute(text(f'SELECT count(*) FROM {tbl}')).scalar()
            print("  count",cnt)
        except: pass
        try:
            rows=db.execute(text(f'SELECT * FROM {tbl} LIMIT 3')).fetchall()
            for r in rows: print("  ",r)
        except Exception as e:
            print("  row err",e); db.rollback()
finally:
    db.close()
