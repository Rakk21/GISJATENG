from pydantic import BaseModel, ConfigDict


class DapilBase(BaseModel):
    kode: str
    nama: str
    jenis: str
    tahun: int
    wilayah_induk_id: int | None = None
    aktif: bool = True


class DapilCreate(DapilBase):
    pass


class DapilUpdate(BaseModel):
    kode: str | None = None
    nama: str | None = None
    jenis: str | None = None
    tahun: int | None = None
    wilayah_induk_id: int | None = None
    aktif: bool | None = None


class DapilResponse(DapilBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DapilWilayahSet(BaseModel):
    wilayah_ids: list[int]
