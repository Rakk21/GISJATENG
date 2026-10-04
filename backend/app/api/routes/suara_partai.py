from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids
from app.models.dapil_wilayah import DapilWilayah
from app.models.pengguna import Pengguna
from app.models.suara_partai import SuaraPartai
from app.models.wilayah import Wilayah
from app.models.partai import Partai
from app.schemas.suara_partai import (
    SuaraPartaiCreate,
    SuaraPartaiResponse,
    SuaraPartaiUpdate,
    SuaraPartaiWithNames,
)

router = APIRouter(prefix="/api/suara-partai", tags=["Suara"])


def _allowed_suara(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/", response_model=list[SuaraPartaiWithNames])
def list_suara(db: Session = Depends(get_db)):
    rows = db.execute(
        select(SuaraPartai, Wilayah.nama, Partai.nama)
        .join(Wilayah, SuaraPartai.wilayah_id == Wilayah.id, isouter=True)
        .join(Partai, SuaraPartai.partai_id == Partai.id, isouter=True)
        .order_by(SuaraPartai.wilayah_id, SuaraPartai.partai_id)
    ).all()
    return [
        SuaraPartaiWithNames(
            id=r.id,
            wilayah_id=r.wilayah_id,
            partai_id=r.partai_id,
            suara=r.suara,
            level=r.level,
            wilayah_nama=w_nama,
            partai_nama=p_nama,
        )
        for r, w_nama, p_nama in rows
    ]


@router.get("/admin", response_model=list[SuaraPartaiWithNames])
def list_suara_admin(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    aw = _allowed_suara(db, current)
    q = select(SuaraPartai, Wilayah.nama, Partai.nama).join(Wilayah, SuaraPartai.wilayah_id == Wilayah.id, isouter=True).join(Partai, SuaraPartai.partai_id == Partai.id, isouter=True).order_by(SuaraPartai.wilayah_id, SuaraPartai.partai_id)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(SuaraPartai.wilayah_id.in_(aw))
    rows = db.execute(q).all()
    return [SuaraPartaiWithNames(id=r.id, wilayah_id=r.wilayah_id, partai_id=r.partai_id, suara=r.suara, level=r.level, wilayah_nama=a, partai_nama=b) for r, a, b in rows]


@router.post("/", response_model=SuaraPartaiResponse, status_code=201)
def create_suara(payload: SuaraPartaiCreate, db: Session = Depends(get_db)):
    row = SuaraPartai(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{row_id}", response_model=SuaraPartaiResponse)
def update_suara(row_id: int, payload: SuaraPartaiUpdate, db: Session = Depends(get_db)):
    row = db.get(SuaraPartai, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{row_id}", status_code=204)
def delete_suara(row_id: int, db: Session = Depends(get_db)):
    row = db.get(SuaraPartai, row_id)
    if not row:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    db.delete(row)
    db.commit()
