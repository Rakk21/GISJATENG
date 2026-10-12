import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/geo", tags=["Geo"])

# desa.geojson di frontend/public/geojson/ — backend jalan dari D:\GIS_JATENG
# properti: FID, NAME, KODE_KEC (33.05.12), KODE_KD (33.05.12.2011),
# KODE_KK (33.05), KECAMATAN, KEL_DESA, KAB_KOTA, PROVINSI, JENIS_KD
CANDIDATES = [
    Path(__file__).resolve().parents[4] / "frontend" / "public" / "geojson" / "desa.geojson",
    Path(__file__).resolve().parents[3] / "frontend" / "public" / "geojson" / "desa.geojson",
    Path("frontend/public/geojson/desa.geojson"),
    Path("public/geojson/desa.geojson"),
]

_desa_cache: dict | None = None


def _load_desa() -> dict:
    global _desa_cache
    if _desa_cache is not None:
        return _desa_cache
    last_err = None
    for p in CANDIDATES:
        try:
            if p.exists():
                _desa_cache = json.loads(p.read_text(encoding="utf-8"))
                return _desa_cache
        except Exception as e:
            last_err = e
    raise FileNotFoundError(f"desa.geojson tidak ditemukan, tried {[str(x) for x in CANDIDATES]} last_err={last_err}")


def _norm(v: str) -> str:
    return "".join(ch for ch in v.strip().lower() if ch.isalnum())


def _parse_kab(v: str) -> tuple[str | None, str]:
    first = v.split("/")[0].strip().lower()
    t = None
    rest = first
    if rest.startswith("kabupaten "):
        t = "kabupaten"
        rest = rest[10:]
    elif rest.startswith("kab. "):
        t = "kabupaten"
        rest = rest[5:]
    elif rest.startswith("kab "):
        t = "kabupaten"
        rest = rest[4:]
    elif rest.startswith("kota "):
        t = "kota"
        rest = rest[5:]
    base = "".join(ch for ch in rest if ch.isalnum())
    return t, base


def _is_same_kab_kota(geo_kab: str, atlas_name: str) -> bool:
    gt, gb = _parse_kab(geo_kab)
    at, ab = _parse_kab(atlas_name)
    if not gb or not ab:
        return False
    if gt and at:
        return gt == at and gb == ab
    if not gt and at:
        return at == "kabupaten" and gb == ab
    if gt and not at:
        return gb == ab
    return gb == ab


@router.get("/desa")
def get_desa_geo(
    kode_kec: List[str] | None = Query(default=None, description="Filter exact KODE_KEC (ex: 33.05.12). Filter OR."),
    kecamatan: List[str] | None = Query(default=None, description="Filter nama KECAMATAN (ex: 'Kebumen'). Filter OR, case-insensitive."),
    kab_kota: List[str] | None = Query(default=None, description="Penyaring KAB_KOTA atlas (ex: 'Kabupaten Kebumen'). Dipakai bersama kecamatan."),
    kode_kd: List[str] | None = Query(default=None, description="Filter exact KODE_KD (ex: 33.05.12.2011)"),
):
    """
    Kembalikan FeatureCollection desa/kelurahan yang terfilter.
    - Prioritas: kode_kec exact > kode_kd exact > nama kecamatan (+kab_kota opsional).
    - Wajib isi salah satu filter (jangan kirim 8562 fitur 189MB sekaligus).
    """
    if not kode_kec and not kecamatan and not kode_kd:
        return JSONResponse(
            status_code=400,
            content={"detail": "Wajib isi kode_kec, kecamatan, atau kode_kd. Contoh: /api/geo/desa?kode_kec=33.05.12"},
        )
    data = _load_desa()
    feats = data.get("features", [])
    wanted_kec = set(k.strip() for k in (kode_kec or []) if k and k.strip())
    wanted_kd = set(k.strip() for k in (kode_kd or []) if k and k.strip())
    wanted_nama = [_norm(k) for k in (kecamatan or []) if k and k.strip()]
    wanted_kab = [k for k in (kab_kota or []) if k and k.strip()]

    out = []
    for f in feats:
        props = f.get("properties", {})
        kkec = str(props.get("KODE_KEC", "")).strip()
        kkd = str(props.get("KODE_KD", "")).strip()
        kec = str(props.get("KECAMATAN", "")).strip()
        kab = str(props.get("KAB_KOTA", "")).strip()
        keep = False
        if wanted_kd and kkd in wanted_kd:
            keep = True
        if not keep and wanted_kec and kkec in wanted_kec:
            keep = True
        if not keep and wanted_nama:
            nkec = _norm(kec)
            for w in wanted_nama:
                if nkec == w:
                    if wanted_kab:
                        for wk in wanted_kab:
                            if _is_same_kab_kota(kab, wk):
                                keep = True
                                break
                    else:
                        keep = True
                    if keep:
                        break
        if keep:
            out.append(f)

    result = {
        "type": "FeatureCollection",
        "name": "desa_filtered",
        "features": out,
    }
    if "crs" in data:
        result["crs"] = data["crs"]
    return JSONResponse(content=result)
