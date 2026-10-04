"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, apiBase } from "@/lib/auth";

type Row = { id: number; wilayah_id: number; wilayah_nama?: string | null; partai_id: number; partai_nama?: string | null; suara: number; level: string };
const n = new Intl.NumberFormat("id-ID");

export default function AdminSuaraPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  function load() {
    setLoading(true);
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = hasToken ? `${apiBase()}/api/suara-partai/admin` : `${apiBase()}/api/suara-partai/`;
    fetch(url, { headers: hasToken ? authHeaders() : {}, cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login.");
        if (!r.ok) throw new Error("Gagal memuat");
        return r.json();
      })
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);
  const filtered = rows.filter((r) => !q || `${r.wilayah_nama ?? ""} ${r.partai_nama ?? ""} ${r.level}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Data Suara" description="Perolehan suara per wilayah & partai (Election 2024). Terfilter otomatis per dapil untuk Admin." badge={`${filtered.length} baris`} actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>} />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}
      <Card className="mb-3">
        <CardBody>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari wilayah / partai / level..." className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </CardBody>
      </Card>
      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Wilayah</Th>
              <Th>Partai</Th>
              <Th>Suara</Th>
              <Th>Level</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-slate-500">Tidak ada data.</Td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-medium">{r.wilayah_nama ?? r.wilayah_id}</Td>
                  <Td>
                    <Badge tone="slate">{r.partai_nama ?? r.partai_id}</Badge>
                  </Td>
                  <Td className="text-right font-mono text-xs font-bold">{n.format(r.suara)}</Td>
                  <Td>
                    <Badge tone={r.level === "kab_kota" ? "violet" : "amber"}>{r.level}</Badge>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
