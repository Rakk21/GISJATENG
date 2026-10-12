from pydantic import BaseModel, ConfigDict


class WilayahResponse(BaseModel):
    id: int
    kode_kemendagri: str
    nama: str
    tingkat: str
    parent_id: int | None

    model_config = ConfigDict(from_attributes=True)


class WilayahSearchResult(BaseModel):
    id: int
    kode_kemendagri: str
    nama: str
    tingkat: str
    parent_id: int | None
    parent_nama: str | None = None
    parent_tingkat: str | None = None
    breadcrumb: str
    dapil_ids: list[int] = []


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