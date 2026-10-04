from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Dapil(Base):
    __tablename__ = "dapil"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    kode: Mapped[str] = mapped_column(String(40), nullable=False)
    nama: Mapped[str] = mapped_column(String(150), nullable=False)
    jenis: Mapped[str] = mapped_column(String(30), nullable=False)
    tahun: Mapped[int] = mapped_column(Integer, nullable=False)
    wilayah_induk_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="SET NULL"), nullable=True)
    aktif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
