"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders, fetchMe, apiBase } from "@/lib/auth";
import WilayahSearch, { type WilayahSearchResult } from "@/components/wilayah/WilayahSearch";

type Wilayah = { id: number; kode_kemendagri: string; nama: string; tingkat: string; parent_id: number | null };

const TINGKAT: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "provinsi", label: "Provinsi" },
  { value: "kabupaten_kota", label: "Kabupaten/Kota" },
  { value: "kecamatan", label: "Kecamatan" },
  { value: "desa", label: "Desa/Kelurahan" },
];

const TINGKAT_VALUES = TINGKAT.filter((t) => t.value).map((t) => t.value);

function AdminWilayahInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("tingkat") ?? "";
  const initialQ = searchParams.get("q") ?? "";
  const [tingkat, setTingkat] = useState(initial);
  const [rows, setRows] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState(initialQ);
  const [me, setMe] = useState<{ role: string } | null>(null);
  // pencarian ala sistem pengurus — duplikat muncul pilihan, filter scope dapil/kabupaten
  const [dapils, setDapils] = useState<{ id: number; kode: string; nama: string }[]>([]);
  const [kabList, setKabList] = useState<Wilayah[]>([]);
  const [filterDapil, setFilterDapil] = useState<string>("");
  const [filterKab, setFilterKab] = useState<string>("");
  const [picked, setPicked] = useState<WilayahSearchResult | null>(null);

  // form CRUD super_admin
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [tingkatForm, setTingkatForm] = useState("kecamatan");
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMe().then((m) => m && setMe({ role: m.role }));
  }, []);

  useEffect(() => {
    // opsi dapil & kabupaten untuk filter scope (sama kayak register sistem pengurus)
    fetch(`${apiBase()}/api/dapil/`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j: { id: number; kode: string; nama: string }[]) => setDapils(j))
      .catch(() => {});
    fetch(`${apiBase()}/api/wilayah/kabupaten-kota`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setKabList)
      .catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    setErr(null);
    const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = isAuthed ? `${apiBase()}/api/wilayah/admin` : `${apiBase()}/api/wilayah/`;
    fetch(url, { headers: authHeaders(), cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login — masuk dulu untuk filter per dapil.");
        if (!r.ok) throw new Error("Gagal memuat wilayah");
        return r.json() as Promise<Wilayah[]>;
      })
      .then(setRows)
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : "Gagal memuat");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = searchParams.get("tingkat") ?? "";
    setTingkat(t);
    const qq = searchParams.get("q") ?? "";
    if (qq) setQ(qq);
  }, [searchParams]);

  const filtered = rows.filter((r) => {
    if (tingkat && r.tingkat !== tingkat) return false;
    if (q && !`${r.nama} ${r.kode_kemendagri}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const isSuper = me?.role === "super_admin";

  // id wilayah terpilih untuk highlight di tabel (kalau hasil search dipilih)
  const pickedId = picked?.id ?? null;

  function resetForm() {
    setKode("");
    setNama("");
    setTingkatForm("kecamatan");
    setParentId("");
    setEditing(null);
  }

  function startEdit(r: Wilayah) {
    setEditing(r.id);
    setKode(r.kode_kemendagri);
    setNama(r.nama);
    setTingkatForm(TINGKAT_VALUES.includes(r.tingkat) ? r.tingkat : "kecamatan");
    setParentId(r.parent_id !== null && r.parent_id !== undefined ? String(r.parent_id) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!kode.trim() || !nama.trim()) {
      setErr("Kode Kemendagri dan nama wilayah wajib diisi.");
      return;
    }
    if (!TINGKAT_VALUES.includes(tingkatForm)) {
      setErr("Tingkat wilayah tidak valid.");
      return;
    }
    let pid: number | null = null;
    if (parentId.trim() !== "") {
      const x = Number(parentId);
      if (!Number.isInteger(x) || x <= 0) {
        setErr("Parent ID harus bilangan bulat positif atau dikosongkan.");
        return;
      }
      pid = x;
    }
    setSaving(true);
    try {
      const url = editing ? `${apiBase()}/api/wilayah/admin/${editing}` : `${apiBase()}/api/wilayah/admin`;
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = editing
        ? { kode_kemendagri: kode.trim(), nama: nama.trim(), tingkat: tingkatForm, parent_id: pid }
        : { kode_kemendagri: kode.trim(), nama: nama.trim(), tingkat: tingkatForm, parent_id: pid };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) throw new Error("Belum login.");
      if (res.status === 403) throw new Error("Hanya Super Admin yang dapat mengelola wilayah.");
      if (!res.ok) throw new Error((await res.text()) || "Gagal menyimpan wilayah");
      resetForm();
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus wilayah ini? Gagal jika masih punya wilayah anak / data terkait.")) return;
    const res = await fetch(`${apiBase()}/api/wilayah/admin/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      setErr((await res.text()) || "Gagal menghapus wilayah");
      return;
    }
    if (editing === id) resetForm();
    load();
  }

  return (
    <div>
      <PageHeader
        title="Data Wilayah"
        description={`Kelola hierarki Provinsi → Kabupaten/Kota → Kecamatan → Desa. ${me ? (isSuper ? "Super Admin: semua wilayah." : "Admin: hanya wilayah dalam dapil Anda.") : "Login untuk filter per dapil."}`}
        badge={tingkat ? TINGKAT.find((t) => t.value === tingkat)?.label : "Semua tingkat"}
        actions={
          <>
            <select value={tingkat} onChange={(e) => router.push(`/admin/wilayah${e.target.value ? `?tingkat=${e.target.value}` : ""}`)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              {TINGKAT.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button variant="ghost" onClick={load}>Muat ulang</Button>
          </>
        }
      />

      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      {isSuper && (
        <Card className="mb-4">
          <CardHeader>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{editing ? "Ubah wilayah" : "Tambah wilayah"}</span>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Kode Kemendagri
                <input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="33.01.01" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Nama
                <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama wilayah" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Tingkat
                <select value={tingkatForm} onChange={(e) => setTingkatForm(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                  {TINGKAT_VALUES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Parent ID <span className="font-normal text-slate-400">(opsional)</span>
                <input value={parentId} onChange={(e) => setParentId(e.target.value)} inputMode="numeric" placeholder="id induk" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <div className="flex items-end gap-2 md:col-span-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah"}
                </Button>
                {editing !== null && (
                  <Button type="button" variant="ghost" onClick={resetForm}>Batal</Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Pencarian wilayah ala sistem pengurus — duplikat: pilih induk, filter hanya dapil/kab terpilih */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Pencarian wilayah</span>
            <span style={{ fontSize: 11, color: "var(--adm-faint, #9ba09e)" }}>
              Kalau nama sama, pilih sesuai wilayah induk · hanya dalam dapil/kabupaten terpilih
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-3">
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--adm-muted)" }}>
              Filter Dapil
              <select value={filterDapil} onChange={(e) => { setFilterDapil(e.target.value); setPicked(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">Semua (sesuai hak Anda)</option>
                {dapils.map((d) => (
                  <option key={d.id} value={String(d.id)}>{d.kode} — {d.nama}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--adm-muted)" }}>
              Filter Kabupaten/Kota
              <select value={filterKab} onChange={(e) => { setFilterKab(e.target.value); setPicked(null); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                <option value="">Semua</option>
                {kabList.map((k) => (
                  <option key={k.id} value={k.nama}>{k.nama}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--adm-muted)" }}>Tingkat</span>
              <span style={{ padding: "8px 10px", border: "1px solid var(--adm-border, #e4e4e3)", borderRadius: 8, background: "var(--adm-bg, #f4f4f3)", fontSize: 12, color: "var(--adm-faint)" }}>
                {tingkat ? TINGKAT.find((t) => t.value === tingkat)?.label : "Semua tingkat"} — ikut filter tabel
              </span>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <WilayahSearch
              value={picked}
              onSelect={setPicked}
              tingkat={tingkat || null}
              dapilId={filterDapil ? Number(filterDapil) : null}
              kabupatenKota={filterKab || null}
              placeholder={filterKab ? `Cari di ${filterKab}...` : filterDapil ? "Cari dalam dapil terpilih..." : "Cari wilayah (nama/kode) — duplikat akan muncul pilihan induk..."}
              label="Cari & pilih wilayah"
            />
            <p style={{ marginTop: 8, fontSize: 11, color: "var(--adm-faint)" }}>
              Contoh: ketik <code>Kendal</code> → muncul <b>Kabupaten Kendal</b> dan <b>Kec. Kendal</b> dengan breadcrumb <code>Kabupaten Kendal &gt; Kendal</code>. Pilih salah satu. Jika filter Dapil/Kab diisi, hasil hanya dari wilayah tersebut (sesuai sistem pengurus).
            </p>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / kode..." className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm md:w-72" />
            <Badge tone="slate">{filtered.length} wilayah</Badge>
            {!isSuper && me && <Badge tone="amber">Terfilter per dapil</Badge>}
            {picked ? <Badge tone="green">Terpilih: {picked.breadcrumb}</Badge> : null}
          </div>
        </CardBody>
      </Card>

      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Nama</Th>
              <Th>Tingkat</Th>
              <Th>Induk</Th>
              {isSuper && <Th>Aksi</Th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={isSuper ? 5 : 4} className="py-8 text-center text-slate-500">
                  Memuat...
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={isSuper ? 5 : 4} className="py-8 text-center text-slate-500">
                  Tidak ada data{tingkat ? ` untuk ${tingkat}` : ""}.
                </Td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((r) => {
                const isPicked = pickedId === r.id;
                return (
                  <tr key={r.id} className={`border-t hover:bg-slate-50 ${isPicked ? "bg-[var(--adm-accent-lt)] ring-1 ring-[#c5d8cc]" : "border-slate-100"}`}>
                    <Td className="font-mono text-xs">{r.kode_kemendagri}</Td>
                    <Td className="font-medium">
                      {r.nama}
                      {isPicked ? <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-[var(--adm-accent)] ring-1 ring-[#c5d8cc]">TERPILIH</span> : null}
                    </Td>
                    <Td>
                      <Badge tone="slate">{r.tingkat}</Badge>
                    </Td>
                    <Td className="text-xs text-slate-500">{r.parent_id ?? "—"}</Td>
                    {isSuper && (
                      <Td>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Edit</Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Hapus</Button>
                        </div>
                      </Td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableWrap>

      <p className="mt-3 text-xs text-slate-500">Menampilkan max 200 baris. Gunakan Export untuk unduh CSV. CRUD wilayah untuk super_admin via POST /api/wilayah/admin.</p>
    </div>
  );
}

export default function AdminWilayahPage() {
  return (
    <Suspense fallback={<div className="py-8 text-center text-sm text-slate-500">Memuat...</div>}>
      <AdminWilayahInner />
    </Suspense>
  );
}
