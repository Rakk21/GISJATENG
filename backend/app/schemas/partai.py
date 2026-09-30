from pydantic import BaseModel, ConfigDict


class PartaiResponse(BaseModel):
    id: int
    nama: str
    slug: str
    aktif: bool

    model_config = ConfigDict(from_attributes=True)