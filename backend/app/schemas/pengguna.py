from pydantic import BaseModel, ConfigDict, EmailStr


class PenggunaMeResponse(BaseModel):
    id: int
    surel: str
    nama: str | None
    peran: str
    role: str  # normalized super_admin/admin
    dapil_ids: list[int]
    dapil_type: str | None = None
    dapil_number: int | None = None
    kabupaten_kota: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PenggunaCreate(BaseModel):
    surel: str
    nama: str | None = None
    peran: str = "admin"  # super_admin | admin | user
    password: str
    dapil_ids: list[int] = []


class PenggunaUpdate(BaseModel):
    nama: str | None = None
    peran: str | None = None
    password: str | None = None
    dapil_ids: list[int] | None = None
    aktif: bool | None = None


class PenggunaListItem(BaseModel):
    id: int
    surel: str
    nama: str | None
    peran: str
    role: str
    dapil_ids: list[int]

    model_config = ConfigDict(from_attributes=True)
