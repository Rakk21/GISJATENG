from sqlalchemy import BigInteger, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class KepalaDesa(Base):
    __tablename__ = "kepala_desa"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    partai_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="SET NULL"), nullable=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
