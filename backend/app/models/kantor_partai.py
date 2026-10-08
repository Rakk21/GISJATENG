from sqlalchemy import BigInteger, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
class KantorPartai(Base):
    __tablename__ = "kantor_partai"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    alamat: Mapped[str | None] = mapped_column(Text, nullable=True)
    wilayah_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("wilayah.id", ondelete="CASCADE"), nullable=False)
    partai_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("partai.id", ondelete="SET NULL"), nullable=True)
    ada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
