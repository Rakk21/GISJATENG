"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders, fetchMe, type Me, apiBase } from "@/lib/auth";

type Dapil = { id: number; kode: string; nama: string };

export default function AdminExportPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [dapilId, setDapilId] = useState<string>("");

  useEffect(() => {
    fetchMe().then(setMe);
    fetch(`${apiBase()}/api/dapil/`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setDapils)
      .catch(() => {});
  }, []);

  function hrefFor(kind: "anggota.csv" | "suara.csv") {
    const base = `${apiBase()}/api/export/${kind}`;
    return dapilId ? `${base}?dapil_id=${dapilId}` : base;
  }

  function download(kind: "anggota.csv" | "suara.csv") {
    const t = typeof window !== "undefined" ? localStorage.getItem("webgis_token") : null;
    if (!t) {
      window.open(hrefFor(kind), "_blank");
      return;
    }
    fetch(hrefFor(kind), { headers: { Authorization: `Bearer ${t}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = kind;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => alert(e.message));
  }

  const isSuper = me?.role === "super_admin";

  return (
    <div>
      <PageHeader
        title="Export Data"
        description="Unduh CSV terfilter otomatis per dapil. Admin hanya dapat export dapilnya; Super Admin semua."
        badge={isSuper ? "Super Admin" : me ? "Admin" : "Tamu"}
      />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-bold">Filter dapil (opsional)</h2>
          <p className="mt-1 text-xs text-slate-500">Kosongkan untuk export sesuai hak akses Anda. Pilih dapil untuk filter spesifik.</p>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Dapil
              <select value={dapilId} onChange={(e) => setDapilId(e.target.value)} className="min-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="">— sesuai hak akses —</option>
                {dapils.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.kode} — {d.nama}
                  </option>
                ))}
              </select>
            </label>
            <Badge tone="slate">{dapils.length} dapil tersedia</Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => download("anggota.csv")}>Unduh anggota.csv</Button>
            <Button onClick={() => download("suara.csv")}>Unduh suara.csv</Button>
            <Button variant="ghost" onClick={() => setDapilId("")}>
              Reset filter
            </Button>
          </div>

          <p className="mt-3 text-xs leading-6 text-slate-600">
            Endpoint: <code className="rounded bg-slate-100 px-1">GET /api/export/anggota.csv</code> &amp; <code className="bg-slate-100 px-1">/api/export/suara.csv</code> · query <code className="bg-slate-100 px-1">?dapil_id=</code> opsional, tetap dicek permission.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
