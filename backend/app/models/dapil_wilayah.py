from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DapilWilayah(Base):
    __tablename__ = "dapil_wilayah"

    dapil_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("dapil.id", ondelete="CASCADE"), primary_key=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), primary_key=True)
