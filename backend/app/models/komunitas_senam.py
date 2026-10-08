from sqlalchemy import BigInteger, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class KomunitasSenam(Base):
    __tablename__ = "komunitas_senam"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    partai_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="SET NULL"), nullable=True)
    jumlah_komunitas: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    keterangan: Mapped[str | None] = mapped_column(Text, nullable=True)
