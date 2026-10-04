from pydantic import BaseModel, ConfigDict


class SuaraPartaiBase(BaseModel):
    wilayah_id: int
    partai_id: int
    suara: int
    level: str  # kab_kota | kecamatan


class SuaraPartaiCreate(SuaraPartaiBase):
    pass


class SuaraPartaiUpdate(BaseModel):
    suara: int | None = None
    level: str | None = None


class SuaraPartaiResponse(SuaraPartaiBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class SuaraPartaiWithNames(SuaraPartaiResponse):
    wilayah_nama: str | None = None
    partai_nama: str | None = None
