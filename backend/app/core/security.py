from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db, settings
from app.models.pengguna import Pengguna
from app.models.pengguna_dapil import PenggunaDapil

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALGORITHM = "HS256"


def _truncate(s: str) -> str:
    b = s.encode("utf-8")
    return b[:72].decode("utf-8", errors="ignore") if len(b) > 72 else s


def hash_password(plain: str) -> str:
    return pwd_context.hash(_truncate(plain))


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(_truncate(plain), hashed)
    except Exception:
        return False


def create_access_token(sub: str, peran: str, expires_minutes: int | None = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": sub, "peran": peran, "exp": exp}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Pengguna:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Tidak terautentikasi",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        sub: str | None = payload.get("sub")
        if not sub:
            raise credentials_exc
    except JWTError:
        raise credentials_exc
    user = db.get(Pengguna, int(sub))
    if not user:
        raise credentials_exc
    return user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional), db: Session = Depends(get_db)
) -> Pengguna | None:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if not sub:
            return None
        user = db.get(Pengguna, int(sub))
        return user
    except JWTError:
        return None


RoleLiteral = Literal["super_admin", "admin", "user"]


def require_role(*allowed: str):
    def _checker(current: Pengguna = Depends(get_current_user)) -> Pengguna:
        role = current.normalized_role
        # 'admin' in DB treated as admin; super_admin has all
        if role == "super_admin":
            return current
        if role in allowed:
            return current
        # allow alias: 'admin' role can access when 'admin' is allowed
        raise HTTPException(status_code=403, detail="Akses ditolak untuk peran ini")
    return _checker


def get_user_dapil_ids(db: Session, user: Pengguna) -> list[int] | None:
    """None = unlimited (super_admin). [] = no dapil assigned."""
    if user.normalized_role == "super_admin":
        return None
    rows = db.execute(
        select(PenggunaDapil.dapil_id).where(PenggunaDapil.pengguna_id == user.id)
    ).scalars().all()
    return list(rows)


def assert_dapil_access(db: Session, user: Pengguna, dapil_id: int) -> None:
    allowed = get_user_dapil_ids(db, user)
    if allowed is None:
        return
    if dapil_id not in allowed:
        raise HTTPException(status_code=403, detail="Tidak punya akses ke dapil ini")
