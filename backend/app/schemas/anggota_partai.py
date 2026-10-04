from pydantic import BaseModel, ConfigDict


class AnggotaPartaiBase(BaseModel):
    wilayah_id: int
    partai_id: int
    jumlah_pendukung: int
    jumlah_penggerak: int
    jumlah_pelopor: int


class AnggotaPartaiCreate(AnggotaPartaiBase):
    pass


class AnggotaPartaiUpdate(BaseModel):
    jumlah_pendukung: int | None = None
    jumlah_penggerak: int | None = None
    jumlah_pelopor: int | None = None


class AnggotaPartaiResponse(AnggotaPartaiBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AnggotaPartaiWithNames(AnggotaPartaiResponse):
    wilayah_nama: str | None = None
    partai_nama: str | None = None
