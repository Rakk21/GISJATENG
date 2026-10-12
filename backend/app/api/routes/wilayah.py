from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional, get_user_dapil_ids, require_role
from app.models.dapil_wilayah import DapilWilayah
from app.models.pengguna import Pengguna
from app.models.wilayah import Wilayah
from app.schemas.wilayah import WilayahCreate, WilayahResponse, WilayahSearchResult, WilayahUpdate


router = APIRouter(
    prefix="/api/wilayah",
    tags=["Wilayah"],
)


def _allowed_wilayah_ids(db: Session, user: Pengguna) -> set[int] | None:
    ids = get_user_dapil_ids(db, user)
    if ids is None:
        return None
    if not ids:
        return set()
    rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id.in_(ids))).scalars().all()
    return set(rows) if rows else None


@router.get("/search", response_model=list[WilayahSearchResult])
def search_wilayah(
    q: str = Query(..., min_length=1, description="Kata kunci nama/kode wilayah"),
    tingkat: str | None = Query(default=None, description="Filter tingkat: provinsi|kabupaten_kota|kecamatan|desa"),
    dapil_id: int | None = Query(default=None, description="Filter hanya wilayah dalam dapil ini"),
    kabupaten_kota: str | None = Query(default=None, description="Filter induk kab/kota — nama exact (mis 'Kabupaten Kendal') atau id string"),
    parent_id: int | None = Query(default=None, description="Filter parent_id exact"),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current: Pengguna | None = Depends(get_current_user_optional),
):
    """
    Pencarian wilayah ala sistem_informasi_pengurus:
    - ilike nama/kode (case-insensitive)
    - jika nama duplikat, backend kembalikan semua kandidat dengan breadcrumb (parent) — frontend tampilkan pilihan
    - hasil otomatis terfilter sesuai scope dapil user (ADMIN hanya wilayah dapilnya, SUPER_ADMIN semua)
    - tambahan filter dapil_id / kabupaten_kota / parent_id untuk membatasi "hanya wilayah dalam kabupaten/kota terpilih"
    """
    term = q.strip()
    if not term:
        return []

    # --- base candidate query ---
    base_q = select(Wilayah).where(
        (Wilayah.nama.ilike(f"%{term}%")) | (Wilayah.kode_kemendagri.ilike(f"%{term}%"))
    )
    if tingkat:
        base_q = base_q.where(Wilayah.tingkat == tingkat)
    if parent_id is not None:
        base_q = base_q.where(Wilayah.parent_id == parent_id)

    # kabupaten_kota string filter: resolve to wilayah id then filter parent chain
    kab_filter_ids: set[int] | None = None
    if kabupaten_kota:
        kab_s = kabupaten_kota.strip()
        # try as integer id
        try:
            kab_id_int = int(kab_s)
            # verify exists
            kab_row = db.get(Wilayah, kab_id_int)
            if kab_row and kab_row.tingkat == "kabupaten_kota":
                kab_filter_ids = {kab_id_int}
            else:
                kab_filter_ids = {kab_id_int}
        except ValueError:
            # by name (exact or ilike)
            like_rows = db.execute(
                select(Wilayah).where(Wilayah.tingkat == "kabupaten_kota").where(Wilayah.nama.ilike(kab_s))
            ).scalars().all()
            if not like_rows:
                like_rows = db.execute(
                    select(Wilayah).where(Wilayah.tingkat == "kabupaten_kota").where(Wilayah.nama.ilike(f"%{kab_s}%"))
                ).scalars().all()
            kab_filter_ids = {r.id for r in like_rows} if like_rows else set()

    # dapil_id filter: wilayah ids for that dapil
    dapil_filter_ids: set[int] | None = None
    if dapil_id is not None:
        rows = db.execute(select(DapilWilayah.wilayah_id).where(DapilWilayah.dapil_id == dapil_id)).scalars().all()
        dapil_filter_ids = set(rows)

    # fetch candidates (pre-scope) — limit * 3 to allow post-filter
    candidates: list[Wilayah] = db.execute(base_q.order_by(Wilayah.nama, Wilayah.id).limit(limit * 4)).scalars().all()

    # build parent map for breadcrumb & ancestor checks (all wilayah)
    all_wilayah: list[Wilayah] = db.execute(select(Wilayah)).scalars().all()
    by_id: dict[int, Wilayah] = {w.id: w for w in all_wilayah}
    # parent chain helper
    def _ancestors(w: Wilayah) -> list[Wilayah]:
        chain: list[Wilayah] = []
        cur = w
        visited: set[int] = set()
        while cur.parent_id is not None and cur.parent_id not in visited:
            visited.add(cur.parent_id)
            p = by_id.get(int(cur.parent_id))
            if not p:
                break
            chain.append(p)
            cur = p
        return chain

    # allowed scope for current user (ADMIN filtered)
    allowed_ids = _allowed_wilayah_ids(db, current) if current else None
    # expand allowed to None means unlimited

    def _passes_scope(w: Wilayah) -> bool:
        # 1) user scope (ADMIN)
        if allowed_ids is not None:
            # direct hit or via ancestor
            if w.id in allowed_ids:
                pass
            else:
                anc = _ancestors(w)
                if not any(a.id in allowed_ids for a in anc):
                    return False
        # 2) dapil filter param
        if dapil_filter_ids is not None:
            # empty set means dapil has no mapping -> allow nothing
            if not dapil_filter_ids:
                return False
            if w.id in dapil_filter_ids:
                pass
            else:
                anc = _ancestors(w)
                if not any(a.id in dapil_filter_ids for a in anc):
                    # also allow if wilayah is parent of a mapped wilayah? e.g. searching kab while dapil maps kec
                    # check reverse: any mapped wilayah has ancestor == w
                    # build reverse index quickly for this check
                    # for perf, just check if w.id is ancestor of any mapped id
                    is_ancestor_of_mapped = False
                    for mid in dapil_filter_ids:
                        m = by_id.get(mid)
                        if not m:
                            continue
                        if m.id == w.id:
                            is_ancestor_of_mapped = True
                            break
                        am = _ancestors(m)
                        if any(a.id == w.id for a in am):
                            is_ancestor_of_mapped = True
                            break
                    if not is_ancestor_of_mapped:
                        return False
        # 3) kabupaten_kota filter param
        if kab_filter_ids is not None:
            if not kab_filter_ids:
                return False
            if w.id in kab_filter_ids:
                pass
            else:
                anc = _ancestors(w)
                if not any(a.id in kab_filter_ids for a in anc):
                    return False
        return True

    filtered = [w for w in candidates if _passes_scope(w)]
    # if too few due to scope, we already limited; no re-query needed for now
    filtered = filtered[:limit]

    # dapil mapping for results (for info)
    result_ids = [w.id for w in filtered]
    dapil_by_wilayah: dict[int, list[int]] = {wid: [] for wid in result_ids}
    if result_ids:
        rows = db.execute(select(DapilWilayah.wilayah_id, DapilWilayah.dapil_id).where(DapilWilayah.wilayah_id.in_(result_ids))).all()
        for wid, did in rows:
            dapil_by_wilayah.setdefault(int(wid), []).append(int(did))

    out: list[WilayahSearchResult] = []
    for w in filtered:
        anc = _ancestors(w)
        # breadcrumb: from root to leaf: e.g. "Jawa Tengah > Kab. Kendal > Boja"
        chain_names = list(reversed([a.nama for a in anc])) + [w.nama]
        breadcrumb = " > ".join(chain_names)
        parent = by_id.get(int(w.parent_id)) if w.parent_id is not None else None
        out.append(
            WilayahSearchResult(
                id=int(w.id),
                kode_kemendagri=w.kode_kemendagri,
                nama=w.nama,
                tingkat=w.tingkat,
                parent_id=int(w.parent_id) if w.parent_id is not None else None,
                parent_nama=parent.nama if parent else None,
                parent_tingkat=parent.tingkat if parent else None,
                breadcrumb=breadcrumb,
                dapil_ids=dapil_by_wilayah.get(int(w.id), []),
            )
        )
    return out


@router.get("/", response_model=list[WilayahResponse])
def get_wilayah(
    db: Session = Depends(get_db),
    current: Pengguna | None = Depends(lambda: None),
):
    # public read for peta publik; admin routes use /api/analisis/peta with auth
    result = db.execute(select(Wilayah).order_by(Wilayah.id))
    return result.scalars().all()


@router.get("/kabupaten-kota", response_model=list[WilayahResponse])
def get_kabupaten_kota(db: Session = Depends(get_db)):
    result = db.execute(select(Wilayah).where(Wilayah.tingkat == "kabupaten_kota").order_by(Wilayah.nama))
    return result.scalars().all()


@router.get("/kecamatan", response_model=list[WilayahResponse])
def get_kecamatan(db: Session = Depends(get_db)):
    result = db.execute(select(Wilayah).where(Wilayah.tingkat == "kecamatan").order_by(Wilayah.nama))
    return result.scalars().all()


@router.get("/admin", response_model=list[WilayahResponse])
def get_wilayah_admin(
    db: Session = Depends(get_db),
    current: Pengguna = Depends(get_current_user),
):
    """Wilayah + filter otomatis per dapil (ADMIN) / semua (SUPER_ADMIN)."""
    aw = _allowed_wilayah_ids(db, current)
    q = select(Wilayah).order_by(Wilayah.id)
    if aw is not None:
        if len(aw) == 0:
            return []
        q = q.where(Wilayah.id.in_(aw))
    return db.execute(q).scalars().all()


# Admin CRUD - super_admin only
@router.post("/admin", response_model=WilayahResponse, status_code=201)
def create_wilayah_admin(
    payload: WilayahCreate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = Wilayah(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/admin/{wilayah_id}", response_model=WilayahResponse)
def update_wilayah_admin(
    wilayah_id: int,
    payload: WilayahUpdate,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = db.get(Wilayah, wilayah_id)
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/admin/{wilayah_id}", status_code=204)
def delete_wilayah_admin(
    wilayah_id: int,
    db: Session = Depends(get_db),
    current: Pengguna = Depends(require_role("super_admin")),
):
    row = db.get(Wilayah, wilayah_id)
    if not row:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    db.delete(row)
    db.commit()