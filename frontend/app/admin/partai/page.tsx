"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, getToken, apiBase } from "@/lib/auth";

type Partai = { id: number; nama: string; slug: string; aktif: boolean };

export default function AdminPartaiPage() {
  const [rows, setRows] = useState<Partai[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form state for super_admin
  const [nama, setNama] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    // partai is public, but we try auth as well for consistency
    fetch(`${apiBase()}/api/partai/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Gagal memuat partai"))))
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!nama || !slug) return;
    setSaving(true);
    setErr(null);
    try {
      // No dedicated POST /api/partai/ yet — backend only has GET. Show info.
      // We attempt POST; if 404/405, inform user.
      const res = await fetch(`${apiBase()}/api/partai/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ nama, slug, aktif: true }),
      });
      if (res.status === 405 || res.status === 404) {
        throw new Error("Endpoint tambah partai belum tersedia di backend — hubungi Super Admin / dev untuk mengaktifkan POST /api/partai/");
      }
      if (!res.ok) throw new Error(await res.text());
      setNama("");
      setSlug("");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Partai"
        description="Daftar partai politik terdaftar. Data partai bersifat global — filter per dapil berlaku di Data Anggota & Data Suara."
        badge={`${rows.length} partai`}
        actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>}
      />

      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      <Card className="mb-4">
        <CardBody>
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Nama partai
              <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Partai Contoh" className="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="partai-contoh" className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <Button type="submit" disabled={saving || !getToken()}>
              {saving ? "Menyimpan..." : "Tambah"}
            </Button>
            {!getToken() && <span className="text-xs text-slate-500">Login sebagai Super Admin untuk menambah.</span>}
          </form>
        </CardBody>
      </Card>

      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Nama</Th>
              <Th>Slug</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-slate-500">Belum ada data partai.</Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.id}</Td>
                  <Td className="font-medium">{r.nama}</Td>
                  <Td className="font-mono text-xs text-slate-600">{r.slug}</Td>
                  <Td>{r.aktif ? <Badge tone="green">Aktif</Badge> : <Badge tone="amber">Nonaktif</Badge>}</Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
