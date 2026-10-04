import csv
import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.pengguna import Pengguna
from app.models.dapil import Dapil
from app.models.dapil_wilayah import DapilWilayah
from app.models.anggota_partai import AnggotaPartai
from app.models.suara_partai import SuaraPartai
from app.models.penduduk import Penduduk
from app.models.jumlah_pemilih import JumlahPemilih
from app.models.wilayah import Wilayah
from app.models.partai import Partai

router = APIRouter(prefix="/api/export", tags=["Export"])


def allowed_wilayah_ids(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    # if dapil has no explicit wilayah mapping, allow all (spec says filter by dapil; map is optional)
    if not rows:
        return None
    return set(rows)


@router.get("/preview")
def preview_counts(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = allowed_wilayah_ids(db, current)
    scope = "semua dapil" if aw is None else f"{len(aw)} wilayah terfilter"
    return {"scope": scope, "role": current.normalized_role}


@router.get("/anggota.csv")
def export_anggota(
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
    dapil_id: int | None = Query(default=None),
):
    # if dapil_id provided, check access
    if dapil_id is not None:
        ids = get_user_dapil_ids(db, current)
        if ids is not None and dapil_id not in ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
        wilayah_ids = set(db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id == dapil_id)).scalars().all()) if dapil_id else None
    else:
        wilayah_ids = allowed_wilayah_ids(db, current)

    q = select(AnggotaPartai, Wilayah.nama, Partai.nama).join(Wilayah, AnggotaPartai.wilayah_id == Wilayah.id).join(Partai, AnggotaPartai.partai_id == Partai.id).order_by(Wilayah.nama, Partai.nama)
    if wilayah_ids is not None and len(wilayah_ids) > 0:
        q = q.where(AnggotaPartai.wilayah_id.in_(wilayah_ids))
    elif wilayah_ids is not None and len(wilayah_ids) == 0:
        q = q.where(AnggotaPartai.wilayah_id == -1)
    rows = db.execute(q).all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["wilayah", "partai", "pendukung", "penggerak", "pelopor"])
    for r, wnama, pnama in rows:
        w.writerow([wnama, pnama, r.jumlah_pendukung, r.jumlah_penggerak, r.jumlah_pelopor])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=anggota.csv"})


@router.get("/suara.csv")
def export_suara(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user), dapil_id: int | None = None):
    if dapil_id is not None:
        ids = get_user_dapil_ids(db, current)
        if ids is not None and dapil_id not in ids:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
        wilayah_ids = set(db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id == dapil_id)).scalars().all()) if dapil_id else None
    else:
        wilayah_ids = allowed_wilayah_ids(db, current)
    q = select(SuaraPartai, Wilayah.nama, Partai.nama).join(Wilayah, SuaraPartai.wilayah_id == Wilayah.id).join(Partai, SuaraPartai.partai_id == Partai.id).order_by(Wilayah.nama, Partai.nama)
    if wilayah_ids is not None and len(wilayah_ids) > 0:
        q = q.where(SuaraPartai.wilayah_id.in_(wilayah_ids))
    elif wilayah_ids is not None and len(wilayah_ids) == 0:
        q = q.where(SuaraPartai.wilayah_id == -1)
    rows = db.execute(q).all()
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["wilayah", "partai", "suara", "level"])
    for r, wnama, pnama in rows:
        w.writerow([wnama, pnama, r.suara, r.level])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=suara.csv"})
