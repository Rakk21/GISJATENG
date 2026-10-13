from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.dapil_wilayah import DapilWilayah
from app.models.jumlah_pemilih import JumlahPemilih
from app.models.pengguna import Pengguna
from app.models.wilayah import Wilayah
from app.schemas.jumlah_pemilih import (
    JumlahPemilihCreate,
    JumlahPemilihResponse,
    JumlahPemilihUpdate,
    JumlahPemilihWithWilayah,
)

router = APIRouter(prefix="/api/jumlah-pemilih", tags=["Pemilih"])


def _allowed_pemilih(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/", response_model=list[JumlahPemilihWithWilayah])
def list_pemilih(db: Session = Depends(get_db)):
    rows = db.execute(
        select(JumlahPemilih, Wilayah.nama)
        .join(Wilayah, JumlahPemilih.wilayah_id == Wilayah.id, isouter=True)
        .order_by(JumlahPemilih.wilayah_id, JumlahPemilih.gender)
    ).all()
    return [
        JumlahPemilihWithWilayah(
            id=r.id,
            wilayah_id=r.wilayah_id,
            jumlah=r.jumlah,
            gender=r.gender,
            wilayah_nama=nama,
        )
        for r, nama in rows
    ]


@router.get("/admin", response_model=list[JumlahPemilihWithWilayah])
def list_pemilih_admin(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = _allowed_pemilih(db, current)
    q = (
        select(JumlahPemilih, Wilayah.nama)
        .join(Wilayah, JumlahPemilih.wilayah_id == Wilayah.id, isouter=True)
        .order_by(JumlahPemilih.wilayah_id, JumlahPemilih.gender)
    )
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(JumlahPemilih.wilayah_id.in_(aw))
    rows = db.execute(q).all()
    return [
        JumlahPemilihWithWilayah(
            id=r.id,
            wilayah_id=r.wilayah_id,
            jumlah=r.jumlah,
            gender=r.gender,
            wilayah_nama=nama,
        )
        for r, nama in rows
    ]


@router.post("/", response_model=JumlahPemilihResponse, status_code=201)
def create_pemilih(
    payload: JumlahPemilihCreate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    aw = _allowed_pemilih(db, current)
    if aw is not None:
        if len(aw) == 0:
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
        if payload.wilayah_id not in aw:
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
    if not db.get(Wilayah, payload.wilayah_id):
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    row = JumlahPemilih(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=JumlahPemilihResponse)
def update_pemilih(
    row_id: int,
    payload: JumlahPemilihUpdate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    row = db.get(JumlahPemilih, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    aw = _allowed_pemilih(db, current)
    if aw is not None:
        if len(aw) == 0 or row.wilayah_id not in aw:
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_pemilih(
    row_id: int,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    row = db.get(JumlahPemilih, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    aw = _allowed_pemilih(db, current)
    if aw is not None:
        if len(aw) == 0 or row.wilayah_id not in aw:
            raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
    db.delete(row)
    db.commit()
