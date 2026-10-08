from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Pengguna(Base):
    __tablename__ = "pengguna"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    surel: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    hash_sandi: Mapped[str] = mapped_column(Text, nullable=False)
    peran: Mapped[str] = mapped_column(String(50), nullable=False, default="user")
    nama: Mapped[str | None] = mapped_column(String(150), nullable=True)
    # scope register — mirip AuthController::register (dapil_type + dapil_number / kabupaten_kota)
    dapil_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dapil_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    kabupaten_kota: Mapped[str | None] = mapped_column(String(150), nullable=True)

    @property
    def normalized_role(self) -> str:
        v = (self.peran or "user").lower()
        # DB currently has 'admin'/'user'; map to spec
        if v in ("super_admin", "superadmin", "super-admin"):
            return "super_admin"
        if v in ("admin", "administrator"):
            return "admin"
        return v
