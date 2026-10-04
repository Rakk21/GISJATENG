from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class JumlahPemilih(Base):
    __tablename__ = "jumlah_pemilih"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    jumlah: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)  # laki_laki | perempuan | total
