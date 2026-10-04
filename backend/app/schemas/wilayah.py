from pydantic import BaseModel, ConfigDict


class WilayahResponse(BaseModel):
    id: int
    kode_kemendagri: str
    nama: str
    tingkat: str
    parent_id: int | None

    model_config = ConfigDict(from_attributes=True)


class WilayahCreate(BaseModel):
    kode_kemendagri: str
    nama: str
    tingkat: str
    parent_id: int | None = None


class WilayahUpdate(BaseModel):
    kode_kemendagri: str | None = None
    nama: str | None = None
    tingkat: str | None = None
    parent_id: int | None = None