"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { authHeaders, fetchMe, type Me, apiBase } from "@/lib/auth";

type Ringkasan = {
  wilayah_total: number;
  wilayah_terfilter: number;
  total_penduduk: number;
  total_pemilih: number;
  total_suara: number;
  total_anggota: number;
  role: string;
  dapil_ids: number[] | null;
  is_scoped: boolean;
};

const n = new Intl.NumberFormat("id-ID");

export default function AdminDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("webgis_token") : null;
    if (!token) {
      setLoading(false);
      setErr("Belum login — masuk untuk melihat data terfilter per dapil.");
      return;
    }
    fetch(`${apiBase()}/api/analisis/ringkasan`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat ringkasan");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const roleLabel = me?.role === "super_admin" ? "Super Admin" : me?.role === "admin" ? "Admin" : me ? "User" : "Tamu";
  const isSuper = me?.role === "super_admin";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan internal WebGIS Jawa Tengah — angka otomatis menyesuaikan hak akses dapil Anda."
        badge={me ? roleLabel : "Internal only"}
        action={
          <>
            <Link href="/admin/analisis" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              Analisis GIS
            </Link>
            <Link href="/admin/export" className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black">
              Export Data
            </Link>
          </>
        }
      />

      {!me && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardBody>
            <p className="text-sm text-amber-800">
              Anda belum login. <Link href="/admin/login" className="font-semibold underline">Masuk</Link> untuk melihat data sesuai dapil. Tanpa login, ringkasan publik tetap tampil tapi filter per-dapil tidak aktif.
            </p>
          </CardBody>
        </Card>
      )}

      {me && (
        <Card className="mb-4">
          <CardBody>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={isSuper ? "violet" : "blue"}>{isSuper ? "SUPER ADMIN — semua dapil" : `ADMIN — ${me.dapil_ids.length} dapil`}</Badge>
              <span className="text-slate-600">
                {me.nama ?? me.surel} {me.dapil_ids.length ? `· dapil #${me.dapil_ids.join(", #")}` : isSuper ? "· akses penuh" : "· belum ada dapil — hubungi Super Admin"}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {err && <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Wilayah terfilter" value={data ? n.format(data.wilayah_terfilter) : "—"} hint={data ? `dari ${n.format(data.wilayah_total)} total` : undefined} tone="slate" />
          <StatCard label="Penduduk" value={data ? n.format(data.total_penduduk) : "—"} hint="∑ penduduk.jumlah" tone="emerald" />
          <StatCard label="Pemilih" value={data ? n.format(data.total_pemilih) : "—"} hint="∑ jumlah_pemilih.jumlah" tone="amber" />
          <StatCard label="Suara" value={data ? n.format(data.total_suara) : "—"} hint="∑ suara_partai.suara" tone="violet" />
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Akses cepat</h2>
            <p className="mt-1 text-xs text-slate-500">Menu paling sering dipakai — disaring otomatis per dapil untuk ADMIN.</p>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/admin/wilayah" className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="text-sm font-semibold">Data Wilayah</div>
                <div className="mt-1 text-xs text-slate-500">Provinsi → Kab/Kota → Kecamatan → Desa</div>
              </Link>
              <Link href="/admin/dapil" className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="text-sm font-semibold">Dapil</div>
                <div className="mt-1 text-xs text-slate-500">ADMIN hanya lihat dapilnya</div>
              </Link>
              <Link href="/admin/anggota" className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="text-sm font-semibold">Data Anggota</div>
                <div className="mt-1 text-xs text-slate-500">Pendukung / Penggerak / Pelopor</div>
              </Link>
              <Link href="/admin/suara" className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                <div className="text-sm font-semibold">Data Suara</div>
                <div className="mt-1 text-xs text-slate-500">Election 2024 per wilayah</div>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Hak akses</h2>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm leading-6 text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">ADMIN</span> — hanya kelola dapil yang diberikan. Menu & angka otomatis terfilter.
              </li>
              <li>
                <span className="font-semibold text-slate-900">SUPER ADMIN</span> — kelola semua dapil + <Link href="/admin/pengguna" className="underline">Manajemen Pengguna</Link> & permission.
              </li>
              <li className="text-xs text-slate-500">Internal only — bukan public website.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
