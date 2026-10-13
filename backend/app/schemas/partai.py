from pydantic import BaseModel, ConfigDict


class PartaiBase(BaseModel):
    nama: str
    slug: str
    aktif: bool = True


class PartaiCreate(PartaiBase):
    pass


class PartaiUpdate(BaseModel):
    nama: str | None = None
    slug: str | None = None
    aktif: bool | None = None


class PartaiResponse(PartaiBase):
    id: int

    model_config = ConfigDict(from_attributes=True)