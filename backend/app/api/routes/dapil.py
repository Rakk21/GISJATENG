from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import assert_dapil_access, get_current_user, get_user_dapil_ids
from app.models.dapil import Dapil
from app.models.dapil_wilayah import DapilWilayah
from app.models.pengguna import Pengguna
from app.schemas.dapil import DapilCreate, DapilResponse, DapilUpdate, DapilWilayahSet

router = APIRouter(prefix="/api/dapil", tags=["Dapil"])


def _filter_for_user(db: Session, user: Pengguna, q):
    allowed = get_user_dapil_ids(db, user)
    if allowed is None:
        return q
    if not allowed:
        return q.where(Dapil.id == -1)  # no dapil
    return q.where(Dapil.id.in_(allowed))


@router.get("/", response_model=list[DapilResponse])
def list_dapil(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    q = select(Dapil).order_by(Dapil.kode)
    q = _filter_for_user(db, current, q)
    return db.execute(q).scalars().all()


@router.get("/{dapil_id}", response_model=DapilResponse)
def get_dapil(dapil_id: int, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    assert_dapil_access(db, current, dapil_id)
    row = db.get(Dapil, dapil_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dapil tidak ditemukan")
    return row


@router.post("/", response_model=DapilResponse, status_code=201)
def create_dapil(payload: DapilCreate, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    row = Dapil(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/{dapil_id}", response_model=DapilResponse)
def update_dapil(dapil_id: int, payload: DapilUpdate, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    assert_dapil_access(db, current, dapil_id)
    # only super_admin can change data; admin can view but not mutate (spec)
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin yang dapat mengubah dapil")
    row = db.get(Dapil, dapil_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dapil tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{dapil_id}", status_code=204)
def delete_dapil(dapil_id: int, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    row = db.get(Dapil, dapil_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dapil tidak ditemukan")
    db.delete(row)
    db.commit()


@router.get("/{dapil_id}/wilayah", response_model=list[int])
def get_dapil_wilayah(dapil_id: int, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    assert_dapil_access(db, current, dapil_id)
    return db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id == dapil_id)).scalars().all()


@router.put("/{dapil_id}/wilayah")
def set_dapil_wilayah(dapil_id: int, payload: DapilWilayahSet, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    assert_dapil_access(db, current, dapil_id)
    if not db.get(Dapil, dapil_id):
        raise HTTPException(status_code=404, detail="Dapil tidak ditemukan")
    db.query(DapilWilayah).filter(DapilWilayah.dapil_id == dapil_id).delete()
    for wid in payload.wilayah_ids:
        db.add(DapilWilayah(dapil_id=dapil_id, wilayah_id=wid))
    db.commit()
    return {"ok": True, "count": len(payload.wilayah_ids)}
