from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.partai import Partai
from app.schemas.partai import PartaiResponse


router = APIRouter(
    prefix="/api/partai",
    tags=["Partai"],
)


@router.get("/", response_model=list[PartaiResponse])
def get_partai(db: Session = Depends(get_db)):
    result = db.execute(
        select(Partai)
        .order_by(Partai.id)
    )

    return result.scalars().all()