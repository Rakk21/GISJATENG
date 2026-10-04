from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Penduduk(Base):
    __tablename__ = "penduduk"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    rentang_usia: Mapped[str] = mapped_column(String(30), nullable=False)
    jumlah_laki_laki: Mapped[int] = mapped_column(Integer, nullable=False)
    jumlah_perempuan: Mapped[int] = mapped_column(Integer, nullable=False)
    jumlah: Mapped[int] = mapped_column(Integer, nullable=False)
