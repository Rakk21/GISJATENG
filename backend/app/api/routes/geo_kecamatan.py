import json
from pathlib import Path
from typing import List

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/geo", tags=["Geo"])

# kecamatan.geojson di frontend/public/geojson/ — backend jalan dari D:\GIS_JATENG
CANDIDATES = [
    Path(__file__).resolve().parents[4] / "frontend" / "public" / "geojson" / "kecamatan.geojson",
    Path(__file__).resolve().parents[3] / "frontend" / "public" / "geojson" / "kecamatan.geojson",
    Path("frontend/public/geojson/kecamatan.geojson"),
    Path("public/geojson/kecamatan.geojson"),
]

_kec_cache: dict | None = None


def _load_kec() -> dict:
    global _kec_cache
    if _kec_cache is not None:
        return _kec_cache
    last_err = None
    for p in CANDIDATES:
        try:
            if p.exists():
                _kec_cache = json.loads(p.read_text(encoding="utf-8"))
                return _kec_cache
        except Exception as e:
            last_err = e
    raise FileNotFoundError(f"kecamatan.geojson tidak ditemukan, tried {[str(x) for x in CANDIDATES]} last_err={last_err}")


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


@router.get("/kecamatan")
def get_kecamatan_geo(
    kab_kota: List[str] | None = Query(default=None, description="Daftar KAB_KOTA atlas (ex: 'Kabupaten Klaten', 'Kota Semarang'). Filter OR."),
    kode_kk: List[str] | None = Query(default=None, description="Filter by KODE_KK (ex: 33.74)"),
):
    """
    Kembalikan FeatureCollection kecamatan yang terfilter.
    - Jika kab_kota diberikan, filter KAB_KOTA via isSameKabKota (handles 'Klaten' vs 'Kabupaten Klaten').
    - Jika kode_kk diberikan, filter exact KODE_KK.
    - Jika keduanya kosong, kembalikan 400 (jangan kirim 576 fitur 61MB sekaligus).
    """
    if not kab_kota and not kode_kk:
        return JSONResponse(
            status_code=400,
            content={"detail": "Wajib isi kab_kota atau kode_kk. Contoh: /api/geo/kecamatan?kab_kota=Kota%20Semarang"},
        )
    data = _load_kec()
    feats = data.get("features", [])
    out = []
    wanted_kab = [k for k in (kab_kota or []) if k and k.strip()]
    wanted_kode = set(k.strip() for k in (kode_kk or []) if k and k.strip())

    for f in feats:
        props = f.get("properties", {})
        kk = str(props.get("KODE_KK", "")).strip()
        kab = str(props.get("KAB_KOTA", "")).strip()
        keep = False
        if wanted_kode and kk in wanted_kode:
            keep = True
        if not keep and wanted_kab:
            for w in wanted_kab:
                if _is_same_kab_kota(kab, w):
                    keep = True
                    break
                # also direct KODE_KK mapping fallback: compare kode via kota.geojson? skip
        if keep:
            out.append(f)

    # preserve header
    result = {
        "type": "FeatureCollection",
        "name": "kecamatan_filtered",
        "features": out,
    }
    # keep crs if exists
    if "crs" in data:
        result["crs"] = data["crs"]
    return JSONResponse(content=result)
