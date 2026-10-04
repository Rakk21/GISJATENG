from sqlalchemy import BigInteger, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AnggotaPartai(Base):
    __tablename__ = "anggota_partai"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    partai_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="CASCADE"), nullable=False)
    jumlah_pendukung: Mapped[int] = mapped_column(Integer, nullable=False)
    jumlah_penggerak: Mapped[int] = mapped_column(Integer, nullable=False)
    jumlah_pelopor: Mapped[int] = mapped_column(Integer, nullable=False)
