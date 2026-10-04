from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, verify_password
from app.models.pengguna import Pengguna
from app.models.pengguna_dapil import PenggunaDapil
from app.schemas.auth import TokenResponse
from app.schemas.pengguna import PenggunaMeResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form: username == surel, password == sandi
    user = db.execute(select(Pengguna).where(Pengguna.surel == form.username)).scalar_one_or_none()
    if not user or not verify_password(form.password, user.hash_sandi):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Surel atau sandi salah")
    token = create_access_token(sub=str(user.id), peran=user.peran)
    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=PenggunaMeResponse)
def me(current: Pengguna = Depends(get_current_user), db: Session = Depends(get_db)):
    dapil_ids = [r for (r,) in db.execute(select(PenggunaDapil.dapil_id).where(PenggunaDapil.pengguna_id == current.id)).all()]
    return PenggunaMeResponse(
        id=current.id,
        surel=current.surel,
        nama=current.nama,
        peran=current.peran,
        role=current.normalized_role,
        dapil_ids=dapil_ids,
    )


@router.post("/logout")
def logout():
    # stateless JWT - client discards token
    return {"ok": True}
