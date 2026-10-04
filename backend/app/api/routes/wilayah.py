from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_user_dapil_ids, require_role
from app.models.dapil_wilayah import DapilWilayah
from app.models.pengguna import Pengguna
from app.models.wilayah import Wilayah
from app.schemas.wilayah import WilayahCreate, WilayahResponse, WilayahUpdate


router = APIRouter(
    prefix="/api/wilayah",
    tags=["Wilayah"],
)


def _allowed_wilayah_ids(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/", response_model=list[WilayahResponse])
def get_wilayah(
    db: Session = Depends(get_db),
    current: Pengguna | None = Depends(lambda: None),
):
    # public read for peta publik; admin routes use /api/analisis/peta with auth
    result = db.execute(select(Wilayah).order_by(Wilayah.id))
    return result.scalars().all()


@router.get("/kabupaten-kota", response_model=list[WilayahResponse])
def get_kabupaten_kota(db: Session = Depends(get_db)):
    result = db.execute(select(Wilayah).where(Wilayah.tingkat == "kabupaten_kota").order_by(Wilayah.nama))
    return result.scalars().all()


@router.get("/kecamatan", response_model=list[WilayahResponse])
def get_kecamatan(db: Session = Depends(get_db)):
    result = db.execute(select(Wilayah).where(Wilayah.tingkat == "kecamatan").order_by(Wilayah.nama))
    return result.scalars().all()


@router.get("/admin", response_model=list[WilayahResponse])
def get_wilayah_admin(
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    """Wilayah + filter otomatis per dapil (ADMIN) / semua (SUPER_ADMIN)."""
    aw = _allowed_wilayah_ids(db, current)
    q = select(Wilayah).order_by(Wilayah.id)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(Wilayah.id.in_(aw))
    return db.execute(q).scalars().all()


# Admin CRUD - super_admin only
@router.post("/admin", response_model=WilayahResponse, status_code=201)
def create_wilayah_admin(
    payload: WilayahCreate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = Wilayah(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/admin/{wilayah_id}", response_model=WilayahResponse)
def update_wilayah_admin(
    wilayah_id: int,
    payload: WilayahUpdate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = db.get(Wilayah, wilayah_id)
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/admin/{wilayah_id}", status_code=204)
def delete_wilayah_admin(
    wilayah_id: int,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = db.get(Wilayah, wilayah_id)
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    db.delete(row)
    db.commit()