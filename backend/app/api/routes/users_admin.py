from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids, hash_password
from app.models.pengguna import Pengguna
from app.models.pengguna_dapil import PenggunaDapil
from app.schemas.pengguna import PenggunaCreate, PenggunaListItem, PenggunaUpdate

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/", response_model=list[PenggunaListItem])
def list_users(db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    users = db.execute(select(Pengguna).order_by(Pengguna.id)).scalars().all()
    # batch dapil
    ids = [u.id for u in users]
    mapping: dict[int, list[int]] = {i: [] for i in ids}
    if ids:
        for uid, did in db.execute(select(PenggunaDapil.pengguna_id, PenggunaDapil.dapil_id).where(PenggunaDapil.pengguna_id.in_(ids))).all():
            mapping[uid].append(did)
    return [PenggunaListItem(id=u.id, surel=u.surel, nama=u.nama, peran=u.peran, role=u.normalized_role, dapil_ids=mapping.get(u.id, [])) for u in users]


@router.post("/", response_model=PenggunaListItem, status_code=201)
def create_user(payload: PenggunaCreate, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    if db.execute(select(Pengguna).where(Pengguna.surel == payload.surel)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Surel sudah terdaftar")
    row = Pengguna(surel=payload.surel, nama=payload.nama, peran=payload.peran, hash_sandi=hash_password(payload.password))
    db.add(row)
    db.flush()
    for did in payload.dapil_ids:
        db.add(PenggunaDapil(pengguna_id=row.id, dapil_id=did))
    db.commit()
    db.refresh(row)
    return PenggunaListItem(id=row.id, surel=row.surel, nama=row.nama, peran=row.peran, role=row.normalized_role, dapil_ids=payload.dapil_ids)


@router.put("/{user_id}", response_model=PenggunaListItem)
def update_user(user_id: int, payload: PenggunaUpdate, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    row = db.get(Pengguna, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    if payload.nama is not None:
        row.nama = payload.nama
    if payload.peran is not None:
        row.peran = payload.peran
    if payload.password:
        row.hash_sandi = hash_password(payload.password)
    if payload.dapil_ids is not None:
        db.execute(delete(PenggunaDapil).where(PenggunaDapil.pengguna_id == user_id))
        for did in payload.dapil_ids:
            db.add(PenggunaDapil(pengguna_id=user_id, dapil_id=did))
    db.commit()
    db.refresh(row)
    dapils = db.execute(select(PenggunaDapil.dapil_id).where(PenggunaDapil.pengguna_id == user_id)).scalars().all()
    return PenggunaListItem(id=row.id, surel=row.surel, nama=row.nama, peran=row.peran, role=row.normalized_role, dapil_ids=list(dapils))


@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), current: Pengguna = Depends(get_current_user)):
    if current.normalized_role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super_admin")
    if user_id == current.id:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus diri sendiri")
    row = db.get(Pengguna, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    db.delete(row)
    db.commit()
