from pydantic import BaseModel


class PartaiRincianItem(BaseModel):
    partai_id: int
    partai_nama: str
    ada: bool
    enum_ada: str  # "ada" | "tidak"
    jumlah_pendukung: int
    jumlah_penggerak: int
    jumlah_pelopor: int
    ada_pendukung: bool
    ada_penggerak: bool
    ada_pelopor: bool


class KepalaDesaRincian(BaseModel):
    ada: bool
    enum_ada: str
    jumlah: int
    detail: list[dict]


class KomunitasSenamRincian(BaseModel):
    total_komunitas: int
    ada: bool
    enum_ada: str
    detail: list[dict]


class TokohRincianItem(BaseModel):
    jenis_tokoh: str
    jumlah_tokoh: int
    partai_nama: str | None
    partai_id: int | None
    keterangan: str | None


class WilayahRincianResponse(BaseModel):
    wilayah: dict
    total_partai: int
    jumlah_partai_ada: int
    partai: list[PartaiRincianItem]
    peran: dict  # total_pendukung, total_penggerak, total_pelopor + enum
    kepala_desa: KepalaDesaRincian
    komunitas_senam: KomunitasSenamRincian
    tokoh_partai: dict  # total_tokoh, daftar
