from pydantic import BaseModel, ConfigDict


class JumlahPemilihBase(BaseModel):
    wilayah_id: int
    jumlah: int
    gender: str  # laki_laki | perempuan | total


class JumlahPemilihCreate(JumlahPemilihBase):
    pass


class JumlahPemilihUpdate(BaseModel):
    jumlah: int | None = None
    gender: str | None = None


class JumlahPemilihResponse(JumlahPemilihBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class JumlahPemilihWithWilayah(JumlahPemilihResponse):
    wilayah_nama: str | None = None
