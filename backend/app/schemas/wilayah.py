from pydantic import BaseModel, ConfigDict


class WilayahResponse(BaseModel):
    id: int
    kode_kemendagri: str
    nama: str
    tingkat: str
    parent_id: int | None

    model_config = ConfigDict(from_attributes=True)