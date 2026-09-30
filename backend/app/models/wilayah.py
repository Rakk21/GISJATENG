from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Wilayah(Base):
    __tablename__ = "wilayah"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    kode_kemendagri: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False
    )

    nama: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    tingkat: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    parent_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("wilayah.id"),
        nullable=True
    )