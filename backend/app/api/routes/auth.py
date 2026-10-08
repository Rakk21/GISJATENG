from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.dapil import Dapil
from app.models.pengguna import Pengguna
from app.models.pengguna_dapil import PenggunaDapil
from app.schemas.auth import TokenResponse
from app.schemas.pengguna import PenggunaMeResponse

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# ── kabupaten/kota options identik sistem_informasi_pengurus AuthController ──
KABUPATEN_KOTA_OPTIONS = [
    "Kabupaten Banjarnegara","Kabupaten Banyumas","Kabupaten Batang","Kabupaten Blora","Kabupaten Boyolali","Kabupaten Brebes","Kabupaten Cilacap","Kabupaten Demak","Kabupaten Grobogan","Kabupaten Jepara","Kabupaten Karanganyar","Kabupaten Kebumen","Kabupaten Kendal","Kabupaten Klaten","Kabupaten Kudus","Kabupaten Magelang","Kabupaten Pati","Kabupaten Pekalongan","Kabupaten Pemalang","Kabupaten Purbalingga","Kabupaten Purworejo","Kabupaten Rembang","Kabupaten Semarang","Kabupaten Sragen","Kabupaten Sukoharjo","Kabupaten Tegal","Kabupaten Temanggung","Kabupaten Wonogiri","Kabupaten Wonosobo","Kota Magelang","Kota Pekalongan","Kota Salatiga","Kota Semarang","Kota Surakarta","Kota Tegal",
]

# mapping kabupaten -> dapil RI / Provinsi (mirror DashboardController + atlas-data.ts)
_ROMAN_TO_NUM = {"I":1,"II":2,"III":3,"IV":4,"V":5,"VI":6,"VII":7,"VIII":8,"IX":9,"X":10}
_RAW_DAPIL_JATENG = {
    "Kabupaten Cilacap":"VIII","Kabupaten Banyumas":"VIII","Kabupaten Purbalingga":"VII","Kabupaten Banjarnegara":"VII","Kabupaten Kebumen":"VII","Kabupaten Purworejo":"VI","Kabupaten Wonosobo":"VI","Kabupaten Magelang":"VI","Kabupaten Boyolali":"V","Kabupaten Klaten":"V","Kabupaten Sukoharjo":"V","Kabupaten Wonogiri":"IV","Kabupaten Karanganyar":"IV","Kabupaten Sragen":"IV","Kabupaten Grobogan":"III","Kabupaten Blora":"III","Kabupaten Rembang":"III","Kabupaten Pati":"III","Kabupaten Kudus":"II","Kabupaten Jepara":"II","Kabupaten Demak":"II","Kabupaten Semarang":"I","Kabupaten Temanggung":"VI","Kabupaten Kendal":"I","Kabupaten Batang":"X","Kabupaten Pekalongan":"X","Kabupaten Pemalang":"X","Kabupaten Tegal":"IX","Kabupaten Brebes":"IX","Kota Magelang":"VI","Kota Surakarta":"V","Kota Salatiga":"I","Kota Semarang":"I","Kota Pekalongan":"X","Kota Tegal":"IX",
}
_PROV_BY_REGION = { "Kota Semarang":1, "Kabupaten Semarang":2, "Kabupaten Kendal":2, "Kota Salatiga":2, "Kabupaten Kudus":3, "Kabupaten Jepara":3, "Kabupaten Demak":3, "Kabupaten Pati":4, "Kabupaten Rembang":4, "Kabupaten Grobogan":5, "Kabupaten Blora":5, "Kabupaten Wonogiri":6, "Kabupaten Karanganyar":6, "Kabupaten Sragen":6, "Kabupaten Klaten":7, "Kabupaten Sukoharjo":7, "Kota Surakarta":7, "Kabupaten Magelang":8, "Kabupaten Boyolali":8, "Kota Magelang":8, "Kabupaten Purworejo":9, "Kabupaten Wonosobo":9, "Kabupaten Temanggung":9, "Kabupaten Purbalingga":10, "Kabupaten Banjarnegara":10, "Kabupaten Kebumen":10, "Kabupaten Cilacap":11, "Kabupaten Banyumas":11, "Kabupaten Tegal":12, "Kabupaten Brebes":12, "Kota Tegal":12, "Kabupaten Batang":13, "Kabupaten Pekalongan":13, "Kabupaten Pemalang":13, "Kota Pekalongan":13 }

class RegisterRequest(BaseModel):
    name: str
    email: str  # allow *.local like sistem pengurus (admin@webgis.local)
    password: str
    password_confirmation: str | None = None
    dapil_type: str  # ri | provinsi | kabupaten_kota
    dapil_number: int | None = None
    kabupaten_kota: str | None = None

class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form: username == surel, password == sandi
    user = db.execute(select(Pengguna).where(Pengguna.surel == form.username)).scalar_one_or_none()
    if not user or not verify_password(form.password, user.hash_sandi):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Surel atau sandi salah")
    token = create_access_token(sub=str(user.id), peran=user.peran)
    return TokenResponse(access_token=token, token_type="bearer")


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.execute(select(Pengguna).where(Pengguna.surel == payload.email)).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email sudah terdaftar")
    if payload.password_confirmation is not None and payload.password != payload.password_confirmation:
        raise HTTPException(status_code=422, detail="Konfirmasi password tidak cocok")
    if len(payload.password) < 8:
        raise HTTPException(status_code=422, detail="Password minimal 8 karakter")
    if payload.dapil_type not in ("ri", "provinsi", "kabupaten_kota"):
        raise HTTPException(status_code=422, detail="dapil_type harus ri / provinsi / kabupaten_kota")

    dapil_ids: list[int] = []
    if payload.dapil_type in ("ri", "provinsi"):
        max_n = 10 if payload.dapil_type == "ri" else 13
        if payload.dapil_number is None or not (1 <= payload.dapil_number <= max_n):
            raise HTTPException(status_code=422, detail=f"Nomor dapil harus 1–{max_n}")
        kind = "ri" if payload.dapil_type == "ri" else "provinsi"
        kode = f"{'RI' if kind=='ri' else 'PROV'}-2024-{payload.dapil_number:02d}"
        row = db.execute(select(Dapil).where(Dapil.kode == kode)).scalar_one_or_none()
        if not row:
            # fallback: jenis + kode prefix
            row = db.execute(select(Dapil).where(Dapil.jenis == kind).order_by(Dapil.id)).scalars().all()
            # try by index
            target = next((r for r in row if str(payload.dapil_number) in r.kode), None)
            if not target:
                raise HTTPException(status_code=500, detail="Dapil tidak ditemukan di database")
            dapil_ids = [target.id]
        else:
            dapil_ids = [row.id]
    else:
        if not payload.kabupaten_kota or payload.kabupaten_kota not in KABUPATEN_KOTA_OPTIONS:
            raise HTTPException(status_code=422, detail="Kabupaten/kota tidak valid")
        # kabupaten_kota -> dua dapil (RI + Provinsi) via mapping
        kab = payload.kabupaten_kota
        ri_roman = _RAW_DAPIL_JATENG.get(kab)
        prov_num = _PROV_BY_REGION.get(kab)
        if not ri_roman or not prov_num:
            raise HTTPException(status_code=500, detail="Mapping dapil kabupaten/kota belum tersedia")
        ri_num = _ROMAN_TO_NUM[ri_roman]
        kode_ri = f"RI-2024-{ri_num:02d}"
        kode_prov = f"PROV-2024-{prov_num:02d}"
        row_ri = db.execute(select(Dapil).where(Dapil.kode == kode_ri)).scalar_one_or_none()
        row_prov = db.execute(select(Dapil).where(Dapil.kode == kode_prov)).scalar_one_or_none()
        if row_ri: dapil_ids.append(row_ri.id)
        if row_prov: dapil_ids.append(row_prov.id)
        if not dapil_ids:
            raise HTTPException(status_code=500, detail="Dapil RI/Provinsi untuk kabupaten/kota tidak ditemukan")

    user = Pengguna(
        surel=payload.email,
        nama=payload.name,
        peran="user",
        hash_sandi=hash_password(payload.password),
        dapil_type=payload.dapil_type,
        dapil_number=payload.dapil_number if payload.dapil_type in ("ri", "provinsi") else None,
        kabupaten_kota=payload.kabupaten_kota if payload.dapil_type == "kabupaten_kota" else None,
    )
    db.add(user)
    db.flush()
    for did in dapil_ids:
        db.add(PenggunaDapil(pengguna_id=user.id, dapil_id=did))
    db.commit()
    token = create_access_token(sub=str(user.id), peran=user.peran)
    return RegisterResponse(access_token=token)


@router.get("/me", response_model=PenggunaMeResponse)
def me(current: Pengguna = Depends(get_current_user), db: Session = Depends(get_db)):
    dapil_ids = [r for (r,) in db.execute(select(PenggunaDapil.dapil_id).where(PenggunaDapil.pengguna_id == current.id)).all()]
    return PenggunaMeResponse(
        id=current.id,
        surel=current.surel,
        nama=current.nama,
        peran=current.peran,
        role=current.normalized_role,
        dapil_ids=dapil_ids,
        dapil_type=getattr(current, "dapil_type", None),
        dapil_number=getattr(current, "dapil_number", None),
        kabupaten_kota=getattr(current, "kabupaten_kota", None),
    )


@router.post("/logout")
def logout():
    # stateless JWT - client discards token
    return {"ok": True}
