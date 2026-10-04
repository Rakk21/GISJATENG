"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders, apiBase } from "@/lib/auth";

type Dapil = { id: number; kode: string; nama: string; jenis: string; tahun: number; aktif: boolean };

export default function AdminDapilPage() {
  const [rows, setRows] = useState<Dapil[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`${apiBase()}/api/dapil/`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login — masuk dulu.");
        if (!r.ok) throw new Error("Gagal memuat dapil");
        return r.json();
      })
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dapil"
        description="Admin hanya melihat & mengelola dapil yang diberikan. Super Admin kelola semua + mapping wilayah."
        badge={`${rows.length} dapil`}
        actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>}
      />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}
      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Nama</Th>
              <Th>Jenis</Th>
              <Th>Tahun</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-slate-500">
                  Tidak ada dapil untuk akun ini. {err ? "" : "Super Admin lihat semua; Admin hanya dapilnya."}
                </Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <Td className="font-mono text-xs">{r.kode}</Td>
                  <Td className="font-medium">{r.nama}</Td>
                  <Td>
                    <Badge tone="slate">{r.jenis}</Badge>
                  </Td>
                  <Td>{r.tahun}</Td>
                  <Td>{r.aktif ? <Badge tone="green">Aktif</Badge> : <Badge tone="amber">Nonaktif</Badge>}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
      <Card className="mt-3">
        <CardBody>
          <p className="text-xs leading-6 text-slate-600">
            API: <code className="rounded bg-slate-100 px-1">GET /api/dapil/</code> otomatis terfilter. Super Admin: <code className="bg-slate-100 px-1">POST/PUT/DELETE /api/dapil/</code> + <code className="bg-slate-100 px-1">PUT /api/dapil/{`{id}`}/wilayah</code>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
