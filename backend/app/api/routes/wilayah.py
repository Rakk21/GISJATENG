from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.wilayah import Wilayah
from app.schemas.wilayah import WilayahResponse


router = APIRouter(
    prefix="/api/wilayah",
    tags=["Wilayah"],
)


@router.get("/", response_model=list[WilayahResponse])
def get_wilayah(db: Session = Depends(get_db)):
    result = db.execute(
        select(Wilayah)
        .order_by(Wilayah.id)
    )

    return result.scalars().all()
@router.get("/kabupaten-kota", response_model=list[WilayahResponse])
def get_kabupaten_kota(db: Session = Depends(get_db)):
    result = db.execute(
        select(Wilayah)
        .where(Wilayah.tingkat == "kabupaten_kota")
        .order_by(Wilayah.nama)
    )

    return result.scalars().all()

@router.get("/kecamatan", response_model=list[WilayahResponse])
def get_kecamatan(db: Session = Depends(get_db)):
    result = db.execute(
        select(Wilayah)
        .where(Wilayah.tingkat == "kecamatan")
        .order_by(Wilayah.nama)
    )

    return result.scalars().all()