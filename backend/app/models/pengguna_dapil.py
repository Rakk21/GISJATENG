from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PenggunaDapil(Base):
    __tablename__ = "pengguna_dapil"

    pengguna_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("pengguna.id", ondelete="CASCADE"), primary_key=True)
    dapil_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("dapil.id", ondelete="CASCADE"), primary_key=True)
