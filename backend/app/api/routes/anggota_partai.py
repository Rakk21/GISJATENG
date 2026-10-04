from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.anggota_partai import AnggotaPartai
from app.models.dapil_wilayah import DapilWilayah
from app.models.pengguna import Pengguna
from app.models.wilayah import Wilayah
from app.models.partai import Partai
from app.schemas.anggota_partai import (
    AnggotaPartaiCreate,
    AnggotaPartaiResponse,
    AnggotaPartaiUpdate,
    AnggotaPartaiWithNames,
)

router = APIRouter(prefix="/api/anggota-partai", tags=["Anggota"])


def _allowed_anggota(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/", response_model=list[AnggotaPartaiWithNames])
def list_anggota(db: Session = Depends(get_db)):
    rows = db.execute(
        select(AnggotaPartai, Wilayah.nama, Partai.nama)
        .join(Wilayah, AnggotaPartai.wilayah_id == Wilayah.id, isouter=True)
        .join(Partai, AnggotaPartai.partai_id == Partai.id, isouter=True)
        .order_by(AnggotaPartai.wilayah_id, AnggotaPartai.partai_id)
    ).all()
    return [
        AnggotaPartaiWithNames(
            id=r.id,
            wilayah_id=r.wilayah_id,
            partai_id=r.partai_id,
            jumlah_pendukung=r.jumlah_pendukung,
            jumlah_penggerak=r.jumlah_penggerak,
            jumlah_pelopor=r.jumlah_pelopor,
            wilayah_nama=w_nama,
            partai_nama=p_nama,
        )
        for r, w_nama, p_nama in rows
    ]


@router.get("/admin", response_model=list[AnggotaPartaiWithNames])
def list_anggota_admin(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = _allowed_anggota(db, current)
    q = select(AnggotaPartai, Wilayah.nama, Partai.nama).join(Wilayah, AnggotaPartai.wilayah_id == Wilayah.id, isouter=True).join(Partai, AnggotaPartai.partai_id == Partai.id, isouter=True).order_by(AnggotaPartai.wilayah_id, AnggotaPartai.partai_id)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(AnggotaPartai.wilayah_id.in_(aw))
    rows = db.execute(q).all()
    return [AnggotaPartaiWithNames(id=r.id, wilayah_id=r.wilayah_id, partai_id=r.partai_id, jumlah_pendukung=r.jumlah_pendukung, jumlah_penggerak=r.jumlah_penggerak, jumlah_pelopor=r.jumlah_pelopor, wilayah_nama=a, partai_nama=b) for r, a, b in rows]


@router.post("/", response_model=AnggotaPartaiResponse, status_code=201)
def create_anggota(payload: AnggotaPartaiCreate, db: Session = Depends(get_db)):
    row = AnggotaPartai(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=AnggotaPartaiResponse)
def update_anggota(row_id: int, payload: AnggotaPartaiUpdate, db: Session = Depends(get_db)):
    row = db.get(AnggotaPartai, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_anggota(row_id: int, db: Session = Depends(get_db)):
    row = db.get(AnggotaPartai, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    db.delete(row)
    db.commit()
