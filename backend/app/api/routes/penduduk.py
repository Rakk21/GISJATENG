from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.dapil_wilayah import DapilWilayah
from app.models.penduduk import Penduduk
from app.models.pengguna import Pengguna
from app.models.wilayah import Wilayah
from app.schemas.penduduk import (
    PendudukCreate,
    PendudukResponse,
    PendudukUpdate,
    PendudukWithWilayah,
)

router = APIRouter(prefix="/api/penduduk", tags=["Penduduk"])


def _allowed_ids(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/", response_model=list[PendudukWithWilayah])
def list_penduduk(db: Session = Depends(get_db), current: Pengguna | None = Depends(lambda: None)):
    # public path for map publik (internal dashboard uses /admin + auth)
    rows = db.execute(
        select(Penduduk, Wilayah.nama)
        .join(Wilayah, Penduduk.wilayah_id == Wilayah.id, isouter=True)
        .order_by(Penduduk.wilayah_id, Penduduk.rentang_usia)
    ).all()
    return [
        PendudukWithWilayah(
            id=r.id,
            wilayah_id=r.wilayah_id,
            rentang_usia=r.rentang_usia,
            jumlah_laki_laki=r.jumlah_laki_laki,
            jumlah_perempuan=r.jumlah_perempuan,
            jumlah=r.jumlah,
            wilayah_nama=nama,
        )
        for r, nama in rows
    ]


@router.get("/admin", response_model=list[PendudukWithWilayah])
def list_penduduk_admin(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = _allowed_ids(db, current)
    q = select(Penduduk, Wilayah.nama).join(Wilayah, Penduduk.wilayah_id == Wilayah.id, isouter=True).order_by(Penduduk.wilayah_id, Penduduk.rentang_usia)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(Penduduk.wilayah_id.in_(aw))
    rows = db.execute(q).all()
    return [
        PendudukWithWilayah(id=r.id, wilayah_id=r.wilayah_id, rentang_usia=r.rentang_usia, jumlah_laki_laki=r.jumlah_laki_laki, jumlah_perempuan=r.jumlah_perempuan, jumlah=r.jumlah, wilayah_nama=nama)
        for r, nama in rows
    ]


@router.post("/", response_model=PendudukResponse, status_code=201)
def create_penduduk(payload: PendudukCreate, db: Session = Depends(get_db)):
    row = Penduduk(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=PendudukResponse)
def update_penduduk(row_id: int, payload: PendudukUpdate, db: Session = Depends(get_db)):
    row = db.get(Penduduk, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_penduduk(row_id: int, db: Session = Depends(get_db)):
    row = db.get(Penduduk, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    db.delete(row)
    db.commit()
