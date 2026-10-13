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

function AdminWilayahInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initial = searchParams.get("tingkat") ?? "";
  const [tingkat, setTingkat] = useState(initial);
  const [rows, setRows] = useState<Wilayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<{ role: string } | null>(null);
  // pencarian ala sistem pengurus — duplikat muncul pilihan, filter scope dapil/kabupaten
  const [dapils, setDapils] = useState<{ id: number; kode: string; nama: string }[]>([]);
  const [kabList, setKabList] = useState<Wilayah[]>([]);
  const [filterDapil, setFilterDapil] = useState<string>("");
  const [filterKab, setFilterKab] = useState<string>("");
  const [picked, setPicked] = useState<WilayahSearchResult | null>(null);

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
    const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = isAuthed ? `${apiBase()}/api/wilayah/admin` : `${apiBase()}/api/wilayah/`;
    fetch(url, { headers: authHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Gagal memuat"))))
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = searchParams.get("tingkat") ?? "";
    setTingkat(t);
  }, [searchParams]);

  const filtered = rows.filter((r) => {
    if (tingkat && r.tingkat !== tingkat) return false;
    if (q && !`${r.nama} ${r.kode_kemendagri}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const isSuper = me?.role === "super_admin";

  // id wilayah terpilih untuk highlight di tabel (kalau hasil search dipilih)
  const pickedId = picked?.id ?? null;

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
            {isSuper && (
              <Button onClick={() => alert("Form tambah wilayah — hubungkan ke POST /api/wilayah/admin (super_admin only)")}>Tambah</Button>
            )}
          </>
        }
      />

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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-slate-500">
                  Memuat...
                </Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-slate-500">
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
