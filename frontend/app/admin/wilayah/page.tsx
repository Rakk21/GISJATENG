"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders, fetchMe, apiBase } from "@/lib/auth";

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

  useEffect(() => {
    fetchMe().then((m) => m && setMe({ role: m.role }));
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

      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / kode..." className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm md:w-72" />
            <Badge tone="slate">{filtered.length} wilayah</Badge>
            {!isSuper && me && <Badge tone="amber">Terfilter per dapil</Badge>}
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
              filtered.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.kode_kemendagri}</Td>
                  <Td className="font-medium">{r.nama}</Td>
                  <Td>
                    <Badge tone="slate">{r.tingkat}</Badge>
                  </Td>
                  <Td className="text-xs text-slate-500">{r.parent_id ?? "—"}</Td>
                </tr>
              ))
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
