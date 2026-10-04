from pydantic import BaseModel, ConfigDict


class PendudukBase(BaseModel):
    wilayah_id: int
    rentang_usia: str
    jumlah_laki_laki: int
    jumlah_perempuan: int
    jumlah: int


class PendudukCreate(PendudukBase):
    pass


class PendudukUpdate(BaseModel):
    rentang_usia: str | None = None
    jumlah_laki_laki: int | None = None
    jumlah_perempuan: int | None = None
    jumlah: int | None = None


class PendudukResponse(PendudukBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class PendudukWithWilayah(PendudukResponse):
    wilayah_nama: str | None = None
