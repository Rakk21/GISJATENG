from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.partai import Partai
from app.models.pengguna import Pengguna
from app.schemas.partai import PartaiCreate, PartaiResponse, PartaiUpdate


router = APIRouter(
    prefix="/api/partai",
    tags=["Partai"],
)


@router.get("/", response_model=list[PartaiResponse])
def get_partai(db: Session = Depends(get_db)):
    result = db.execute(
        select(Partai)
        .order_by(Partai.id)
    )

    return result.scalars().all()


@router.post("/", response_model=PartaiResponse, status_code=201)
def create_partai(
    payload: PartaiCreate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    if db.execute(select(Partai).where(Partai.slug == payload.slug)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Slug sudah terdaftar")
    row = Partai(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{partai_id}", response_model=PartaiResponse)
def update_partai(
    partai_id: int,
    payload: PartaiUpdate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    row = db.get(Partai, partai_id)
    if not row:
        raise HTTPException(status_code=404, detail="Partai tidak ditemukan")
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data and data["slug"] != row.slug:
        if db.execute(select(Partai).where(Partai.slug == data["slug"])).scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Slug sudah terdaftar")
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{partai_id}", status_code=204)
def delete_partai(
    partai_id: int,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    row = db.get(Partai, partai_id)
    if not row:
        raise HTTPException(status_code=404, detail="Partai tidak ditemukan")
    db.delete(row)
    db.commit()