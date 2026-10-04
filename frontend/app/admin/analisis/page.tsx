"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { authHeaders, apiBase } from "@/lib/auth";

type Ringkasan = {
  wilayah_total: number;
  wilayah_terfilter: number;
  total_penduduk: number;
  total_pemilih: number;
  total_suara: number;
  total_anggota: number;
  role: string;
  is_scoped: boolean;
};

const n = new Intl.NumberFormat("id-ID");

export default function AdminAnalisisPage() {
  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setErr(null);
    fetch(`${apiBase()}/api/analisis/ringkasan`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login — masuk untuk lihat ringkasan terfilter.");
        if (!r.ok) throw new Error("Gagal memuat analisis");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Analisis GIS"
        description="Ringkasan spasial & statistik terfilter otomatis per dapil. Super Admin melihat semua; Admin hanya dapilnya."
        badge={data?.is_scoped ? "Terfilter per dapil" : "Semua dapil"}
        actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>}
      />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody>
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-6 w-16 animate-pulse rounded bg-slate-100" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Wilayah terfilter" value={n.format(data.wilayah_terfilter)} hint={`dari ${n.format(data.wilayah_total)}`} tone="slate" />
          <StatCard label="Penduduk" value={n.format(data.total_penduduk)} hint="∑ penduduk" tone="emerald" />
          <StatCard label="Pemilih" value={n.format(data.total_pemilih)} hint="∑ pemilih" tone="amber" />
          <StatCard label="Suara" value={n.format(data.total_suara)} hint="∑ suara" tone="violet" />
        </div>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <h2 className="text-sm font-bold">Peta & layer</h2>
          <p className="mt-1 text-xs text-slate-500">Gunakan endpoint terfilter untuk peta internal.</p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <Badge tone="slate">GET /api/analisis/peta?tingkat=kabupaten_kota</Badge>
            <Badge tone="slate">GET /api/analisis/peta?tingkat=kecamatan</Badge>
            <Badge tone={data?.is_scoped ? "amber" : "green"}>{data?.is_scoped ? "Terfilter" : "Tanpa filter (Super Admin)"}</Badge>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-600">
            Frontend peta publik tetap di <a href="/" className="underline">/</a>. Endpoint <code className="rounded bg-slate-100 px-1">/api/analisis/peta</code> butuh token dan otomatis filter wilayah per dapil.
          </p>
        </CardBody>
      </Card>

      <Card className="mt-3">
        <CardBody>
          <p className="text-xs text-slate-500">Total anggota (agregat): {data ? n.format(data.total_anggota) : "—"} (pendukung+penggerak+pelopor).</p>
        </CardBody>
      </Card>
    </div>
  );
}
