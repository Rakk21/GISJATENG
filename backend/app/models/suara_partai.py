from sqlalchemy import BigInteger, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class SuaraPartai(Base):
    __tablename__ = "suara_partai"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    partai_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="CASCADE"), nullable=False)
    suara: Mapped[int] = mapped_column(Integer, nullable=False)
    level: Mapped[str] = mapped_column(String(8), nullable=False)  # kab_kota | kecamatan
