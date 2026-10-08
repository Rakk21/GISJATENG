from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.wilayah import Wilayah
from app.models.partai import Partai
from app.models.anggota_partai import AnggotaPartai
from app.models.kepala_desa import KepalaDesa
from app.models.komunitas_senam import KomunitasSenam
from app.models.tokoh_partai import TokohPartai

router = APIRouter(prefix="/api/wilayah-rincian", tags=["Wilayah Rincian"])


@router.get("")
def wilayah_rincian(
    wilayah_id: int | None = Query(default=None),
    nama: str | None = Query(default=None),
    tingkat: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _user=Depends(get_current_user_optional),
):
    # 1) resolve wilayah
    wilayah: Wilayah | None = None
    if wilayah_id is not None:
        wilayah = db.get(Wilayah, wilayah_id)
    elif nama:
        q = select(Wilayah).where(Wilayah.nama == nama)
        if tingkat:
            q = q.where(Wilayah.tingkat == tingkat)
        wilayah = db.execute(q).scalars().first()
        if not wilayah:
            q2 = select(Wilayah).where(Wilayah.nama.ilike(f"%{nama.strip()}%"))
            if tingkat:
                q2 = q2.where(Wilayah.tingkat == tingkat)
            wilayah = db.execute(q2).scalars().first()

    is_synthetic = False
    synthetic_source_id: int | None = None
    original_nama: str | None = nama.strip() if nama else None

    if not wilayah:
        if original_nama:
            is_synthetic = True
            # cari wilayah terdekat (kata terakhir) untuk dipakai sebagai sumber data contoh
            last_word = original_nama.split()[-1] if original_nama.split() else original_nama
            try:
                probe = db.execute(select(Wilayah).where(Wilayah.nama.ilike(f"%{last_word}%"))).scalars().first()
                if probe:
                    synthetic_source_id = int(probe.id)
            except Exception:
                synthetic_source_id = None
            from types import SimpleNamespace

            wilayah = SimpleNamespace(  # type: ignore
                id=0,
                nama=original_nama,
                tingkat=tingkat or "kabupaten_kota",
                kode_kemendagri="",
                parent_id=None,
            )
        else:
            raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")

    # id yang dipakai untuk query agregat
    if is_synthetic and synthetic_source_id is not None:
        wid = synthetic_source_id
    else:
        wid = int(wilayah.id)  # type: ignore[attr-defined]

    # 2) partai master + anggota per partai
    partai_rows = db.execute(select(Partai).order_by(Partai.id)).scalars().all()

    # kalau sintetis tanpa sumber → langsung payload nol (tidak 404)
    if is_synthetic and synthetic_source_id is None:
        empty_partai = [
            {"partai_id": p.id, "partai_nama": p.nama, "ada": False, "enum_ada": "tidak", "jumlah_pendukung": 0, "jumlah_penggerak": 0, "jumlah_pelopor": 0, "ada_pendukung": False, "ada_penggerak": False, "ada_pelopor": False}
            for p in partai_rows
        ]
        return {
            "wilayah": {"id": 0, "nama": original_nama, "tingkat": wilayah.tingkat, "kode_kemendagri": "", "parent_id": None, "synthetic": True},  # type: ignore[attr-defined]
            "total_partai": len(partai_rows),
            "jumlah_partai_ada": 0,
            "partai": empty_partai,
            "peran": {"total_pendukung": 0, "total_penggerak": 0, "total_pelopor": 0, "ada_pendukung": False, "ada_penggerak": False, "ada_pelopor": False, "enum_pendukung": "tidak", "enum_penggerak": "tidak", "enum_pelopor": "tidak"},
            "kepala_desa": {"ada": False, "enum_ada": "tidak", "jumlah": 0, "detail": []},
            "komunitas_senam": {"total_komunitas": 0, "ada": False, "enum_ada": "tidak", "detail": []},
            "tokoh_partai": {"total_tokoh": 0, "ada": False, "enum_ada": "tidak", "daftar": []},
        }

    anggota_by_partai: dict[int, AnggotaPartai] = {}
    # wid==0 tidak mungkin sampai sini (sintetis tanpa sumber sudah return), tapi guard
    if wid != 0:
        for row in db.execute(select(AnggotaPartai).where(AnggotaPartai.wilayah_id == wid)).scalars().all():
            anggota_by_partai[row.partai_id] = row

    partai_list = []
    jumlah_partai_ada = 0
    total_pendukung = 0
    total_penggerak = 0
    total_pelopor = 0
    for p in partai_rows:
        ap = anggota_by_partai.get(p.id)
        has = ap is not None and (ap.jumlah_pendukung + ap.jumlah_penggerak + ap.jumlah_pelopor) > 0
        if has:
            jumlah_partai_ada += 1
        pd = ap.jumlah_pendukung if ap else 0
        pg = ap.jumlah_penggerak if ap else 0
        pl = ap.jumlah_pelopor if ap else 0
        total_pendukung += pd
        total_penggerak += pg
        total_pelopor += pl
        partai_list.append({
            "partai_id": p.id,
            "partai_nama": p.nama,
            "ada": has,
            "enum_ada": "ada" if has else "tidak",
            "jumlah_pendukung": pd,
            "jumlah_penggerak": pg,
            "jumlah_pelopor": pl,
            "ada_pendukung": pd > 0,
            "ada_penggerak": pg > 0,
            "ada_pelopor": pl > 0,
        })

    # kumpulkan kec_ids sekali — dipakai untuk agregat kab/kota
    kec_ids: list[int] = []
    if wilayah.tingkat == "kabupaten_kota" and wid != 0:  # type: ignore[attr-defined]
        try:
            kec_ids = [r[0] for r in db.execute(select(Wilayah.id).where(Wilayah.parent_id == wid)).all()]
        except Exception:
            kec_ids = []

    # 3) kepala desa
    kades_rows = db.execute(select(KepalaDesa).where(KepalaDesa.wilayah_id == wid)).scalars().all() if wid != 0 else []
    kades_ada = any(r.ada for r in kades_rows)
    kades_jumlah = len([r for r in kades_rows if r.ada])
    partai_map = {p.id: p.nama for p in partai_rows}
    kades_detail: list[dict] = []
    for r in kades_rows:
        kades_detail.append({"id": r.id, "ada": r.ada, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "wilayah_id": r.wilayah_id})
    if kec_ids:
        kec_kades = db.execute(select(KepalaDesa).where(KepalaDesa.wilayah_id.in_(kec_ids))).scalars().all()
        if kec_kades:
            kades_ada = kades_ada or any(r.ada for r in kec_kades)
            kades_jumlah += len([r for r in kec_kades if r.ada])
            for r in kec_kades:
                kades_detail.append({"id": r.id, "ada": r.ada, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "wilayah_id": r.wilayah_id, "kecamatan": True})

    # 4) komunitas senam
    senam_rows = db.execute(select(KomunitasSenam).where(KomunitasSenam.wilayah_id == wid)).scalars().all() if wid != 0 else []
    senam_total = sum(r.jumlah_komunitas for r in senam_rows)
    senam_detail: list[dict] = [{"id": r.id, "jumlah_komunitas": r.jumlah_komunitas, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "keterangan": r.keterangan} for r in senam_rows]
    if kec_ids:
        kec_senam = db.execute(select(KomunitasSenam).where(KomunitasSenam.wilayah_id.in_(kec_ids))).scalars().all()
        for r in kec_senam:
            senam_total += r.jumlah_komunitas
            senam_detail.append({"id": r.id, "jumlah_komunitas": r.jumlah_komunitas, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "keterangan": r.keterangan, "kecamatan": True})
    senam_ada = senam_total > 0

    # 5) tokoh partai
    tokoh_rows = db.execute(select(TokohPartai).where(TokohPartai.wilayah_id == wid)).scalars().all() if wid != 0 else []
    tokoh_total = sum(r.jumlah_tokoh for r in tokoh_rows)
    tokoh_detail: list[dict] = [{"id": r.id, "jenis_tokoh": r.jenis_tokoh, "jumlah_tokoh": r.jumlah_tokoh, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "keterangan": r.keterangan} for r in tokoh_rows]
    if kec_ids:
        kec_tokoh = db.execute(select(TokohPartai).where(TokohPartai.wilayah_id.in_(kec_ids))).scalars().all()
        for r in kec_tokoh:
            tokoh_total += r.jumlah_tokoh
            tokoh_detail.append({"id": r.id, "jenis_tokoh": r.jenis_tokoh, "jumlah_tokoh": r.jumlah_tokoh, "partai_nama": partai_map.get(r.partai_id) if r.partai_id else None, "keterangan": r.keterangan, "kecamatan": True})

    wilayah_out = {
        "id": wilayah.id,  # type: ignore[attr-defined]
        "nama": wilayah.nama,  # type: ignore[attr-defined]
        "tingkat": wilayah.tingkat,  # type: ignore[attr-defined]
        "kode_kemendagri": wilayah.kode_kemendagri,  # type: ignore[attr-defined]
        "parent_id": wilayah.parent_id,  # type: ignore[attr-defined]
    }
    if is_synthetic:
        wilayah_out["synthetic"] = True  # type: ignore[assignment]
        # nama tetap original_nama (sudah), tapi wid sumber dipakai untuk data — biar panel ada isi

    return {
        "wilayah": wilayah_out,
        "total_partai": len(partai_rows),
        "jumlah_partai_ada": jumlah_partai_ada,
        "partai": partai_list,
        "peran": {
            "total_pendukung": total_pendukung,
            "total_penggerak": total_penggerak,
            "total_pelopor": total_pelopor,
            "ada_pendukung": total_pendukung > 0,
            "ada_penggerak": total_penggerak > 0,
            "ada_pelopor": total_pelopor > 0,
            "enum_pendukung": "ada" if total_pendukung > 0 else "tidak",
            "enum_penggerak": "ada" if total_penggerak > 0 else "tidak",
            "enum_pelopor": "ada" if total_pelopor > 0 else "tidak",
        },
        "kepala_desa": {"ada": kades_ada, "enum_ada": "ada" if kades_ada else "tidak", "jumlah": kades_jumlah, "detail": kades_detail},
        "komunitas_senam": {"total_komunitas": senam_total, "ada": senam_ada, "enum_ada": "ada" if senam_ada else "tidak", "detail": senam_detail},
        "tokoh_partai": {"total_tokoh": tokoh_total, "ada": tokoh_total > 0, "enum_ada": "ada" if tokoh_total > 0 else "tidak", "daftar": tokoh_detail},
    }
