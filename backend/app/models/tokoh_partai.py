from sqlalchemy import BigInteger, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class TokohPartai(Base):
    __tablename__ = "tokoh_partai"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    jenis_tokoh: Mapped[str] = mapped_column(String(50), nullable=False)
    jumlah_tokoh: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    partai_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="SET NULL"), nullable=True)
