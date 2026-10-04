from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.jumlah_pemilih import JumlahPemilih
from app.models.wilayah import Wilayah
from app.schemas.jumlah_pemilih import (
    JumlahPemilihCreate,
    JumlahPemilihResponse,
    JumlahPemilihUpdate,
    JumlahPemilihWithWilayah,
)

router = APIRouter(prefix="/api/jumlah-pemilih", tags=["Pemilih"])


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


@router.post("/", response_model=JumlahPemilihResponse, status_code=201)
def create_pemilih(payload: JumlahPemilihCreate, db: Session = Depends(get_db)):
    row = JumlahPemilih(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=JumlahPemilihResponse)
def update_pemilih(row_id: int, payload: JumlahPemilihUpdate, db: Session = Depends(get_db)):
    row = db.get(JumlahPemilih, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_pemilih(row_id: int, db: Session = Depends(get_db)):
    row = db.get(JumlahPemilih, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    db.delete(row)
    db.commit()
