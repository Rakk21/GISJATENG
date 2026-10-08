"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, apiBase } from "@/lib/auth";

type Row = { id: number; wilayah_id: number; wilayah_nama?: string | null; partai_id: number; partai_nama?: string | null; jumlah_pendukung: number; jumlah_penggerak: number; jumlah_pelopor: number };

const n = new Intl.NumberFormat("id-ID");

export default function AdminAnggotaPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const loadRefetch = useCallback(() => {
    setLoading(true);
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = hasToken ? `${apiBase()}/api/anggota-partai/admin` : `${apiBase()}/api/anggota-partai/`;
    const headers = hasToken ? authHeaders() : {};
    fetch(url, { headers, cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login — data akan tampil tanpa filter dapil. Masuk untuk filter.");
        if (!r.ok) throw new Error("Gagal memuat");
        return r.json();
      })
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRefetch();
  }, [loadRefetch]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = `${r.wilayah_nama ?? ""} ${r.partai_nama ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  return (
    <div>
      <PageHeader title="Data Anggota" description="Pendukung · Penggerak · Pelopor per wilayah. Admin otomatis hanya melihat wilayah dalam dapilnya." badge={`${filtered.length} baris`} actions={<Button variant="ghost" onClick={loadRefetch}>Muat ulang</Button>} />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}
      <Card className="mb-3">
        <CardBody>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari wilayah / partai..." className="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </CardBody>
      </Card>
      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Wilayah</Th>
              <Th>Partai</Th>
              <Th>Pendukung</Th>
              <Th>Penggerak</Th>
              <Th>Pelopor</Th>
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={6} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={6} className="py-8 text-center text-slate-500">Tidak ada data untuk filter ini.</Td>
              </tr>
            ) : (
              filtered.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-medium">{r.wilayah_nama ?? r.wilayah_id}</Td>
                  <Td>
                    <Badge tone="slate">{r.partai_nama ?? r.partai_id}</Badge>
                  </Td>
                  <Td className="text-right font-mono text-xs">{n.format(r.jumlah_pendukung)}</Td>
                  <Td className="text-right font-mono text-xs">{n.format(r.jumlah_penggerak)}</Td>
                  <Td className="text-right font-mono text-xs">{n.format(r.jumlah_pelopor)}</Td>
                  <Td className="text-right font-mono text-xs font-bold">{n.format(r.jumlah_pendukung + r.jumlah_penggerak + r.jumlah_pelopor)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-2 text-xs text-slate-500">CRUD via /api/anggota-partai/ (admin) &amp; /api/anggota-partai/admin (terfilter). Export CSV di menu Export Data.</p>
    </div>
  );
}
