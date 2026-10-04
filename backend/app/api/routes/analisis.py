from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.anggota_partai import AnggotaPartai
from app.models.dapil_wilayah import DapilWilayah
from app.models.jumlah_pemilih import JumlahPemilih
from app.models.penduduk import Penduduk
from app.models.pengguna import Pengguna
from app.models.suara_partai import SuaraPartai
from app.models.wilayah import Wilayah

router = APIRouter(prefix="/api/analisis", tags=["Analisis"])


def scoped_wilayah_ids(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/ringkasan")
def ringkasan(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = scoped_wilayah_ids(db, current)
    scope_filter = None
    if aw is not None:
        if len(aw) == 0:
            return {"wilayah": 0, "total_penduduk": 0, "total_pemilih": 0, "total_suara": 0, "total_anggota": 0, "scope": "tidak ada dapil"}
        scope_filter = aw
    wilayah_cnt = db.execute(select(func.count()).select_from(Wilayah).where(Wilayah.wilayah_id.in_(scope_filter)) if scope_filter is not None else select(func.count()).select_from(Wilayah)).scalar()
    # simpler: count via filtered queries
    def sum_col(model, col, field_wilayah="wilayah_id"):
        q = select(func.coalesce(func.sum(col), 0))
        if scope_filter is not None:
            q = q.where(getattr(model, field_wilayah).in_(scope_filter))
        return db.execute(q).scalar() or 0

    total_penduduk = sum_col(Penduduk, Penduduk.jumlah)
    total_pemilih = sum_col(JumlahPemilih, JumlahPemilih.jumlah)
    total_suara = sum_col(SuaraPartai, SuaraPartai.suara)
    total_anggota = db.execute(
        select(func.coalesce(func.sum(AnggotaPartai.jumlah_pendukung + AnggotaPartai.jumlah_penggerak + AnggotaPartai.jumlah_pelopor), 0)).where(
            AnggotaPartai.wilayah_id.in_(scope_filter) if scope_filter is not None else True
        )
    ).scalar() or 0

    wilayah_total = db.execute(select(func.count()).select_from(Wilayah)).scalar()
    filtered_wilayah = len(scope_filter) if scope_filter is not None else wilayah_total

    return {
        "wilayah_total": wilayah_total,
        "wilayah_terfilter": filtered_wilayah,
        "total_penduduk": total_penduduk,
        "total_pemilih": total_pemilih,
        "total_suara": total_suara,
        "total_anggota": total_anggota,
        "role": current.normalized_role,
        "dapil_ids": get_user_dapil_ids(db, current),
        "is_scoped": scope_filter is not None,
    }


@router.get("/peta")
def peta_wilayah(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user), tingkat: str | None = Query(default=None)):
    """Wilayah untuk peta, terfilter per dapil jika ada mapping."""
    aw = scoped_wilayah_ids(db, current)
    q = select(Wilayah)
    if tingkat:
        q = q.where(Wilayah.tingkat == tingkat)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(Wilayah.id.in_(aw))
    q = q.order_by(Wilayah.nama)
    return [{"id": w.id, "kode_kemendagri": w.kode_kemendagri, "nama": w.nama, "tingkat": w.tingkat, "parent_id": w.parent_id} for w in db.execute(q).scalars().all()]
