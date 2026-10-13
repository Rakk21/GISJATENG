"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, apiBase } from "@/lib/auth";
import WilayahSearch, { type WilayahSearchResult } from "@/components/wilayah/WilayahSearch";

type Row = { id: number; wilayah_id: number; wilayah_nama?: string | null; partai_id: number; partai_nama?: string | null; jumlah_pendukung: number; jumlah_penggerak: number; jumlah_pelopor: number };
type Partai = { id: number; nama: string; slug: string; aktif: boolean };

const n = new Intl.NumberFormat("id-ID");

function toInt(v: string): number | null {
  if (v.trim() === "") return null;
  const x = Number(v);
  if (!Number.isInteger(x) || x < 0) return null;
  return x;
}

export default function AdminAnggotaPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [partai, setPartai] = useState<Partai[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [picked, setPicked] = useState<WilayahSearchResult | null>(null);
  const [partaiId, setPartaiId] = useState("");
  const [pendukung, setPendukung] = useState("");
  const [penggerak, setPenggerak] = useState("");
  const [pelopor, setPelopor] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRefetch = useCallback(() => {
    setLoading(true);
    setErr(null);
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = hasToken ? `${apiBase()}/api/anggota-partai/admin` : `${apiBase()}/api/anggota-partai/`;
    const headers = hasToken ? authHeaders() : {};
    fetch(url, { headers, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data anggota");
        return r.json() as Promise<Row[]>;
      })
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Gagal memuat"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRefetch();
    fetch(`${apiBase()}/api/partai/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j: Partai[]) => setPartai(j))
      .catch(() => {});
  }, [loadRefetch]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = `${r.wilayah_nama ?? ""} ${r.partai_nama ?? ""}`.toLowerCase();
    return s.includes(q.toLowerCase());
  });

  function resetForm() {
    setPicked(null);
    setPartaiId("");
    setPendukung("");
    setPenggerak("");
    setPelopor("");
    setEditing(null);
  }

  function startEdit(r: Row) {
    setEditing(r.id);
    setPicked(null);
    setPartaiId(String(r.partai_id));
    setPendukung(String(r.jumlah_pendukung));
    setPenggerak(String(r.jumlah_penggerak));
    setPelopor(String(r.jumlah_pelopor));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pid = Number(partaiId);
    const a = toInt(pendukung);
    const b = toInt(penggerak);
    const c = toInt(pelopor);
    if (!Number.isInteger(pid) || pid <= 0) {
      setErr("Pilih partai terlebih dahulu.");
      return;
    }
    if (a === null || b === null || c === null) {
      setErr("Jumlah pendukung / penggerak / pelopor harus bilangan bulat >= 0.");
      return;
    }
    if (!editing && !picked) {
      setErr("Cari & pilih wilayah terlebih dahulu.");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${apiBase()}/api/anggota-partai/${editing}` : `${apiBase()}/api/anggota-partai/`;
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = editing
        ? { jumlah_pendukung: a, jumlah_penggerak: b, jumlah_pelopor: c }
        : { wilayah_id: picked!.id, partai_id: pid, jumlah_pendukung: a, jumlah_penggerak: b, jumlah_pelopor: c };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) throw new Error("Belum login — masuk dulu.");
      if (res.status === 403) throw new Error("Tidak punya akses ke wilayah/dapil ini.");
      if (res.status === 404) throw new Error("Wilayah / partai tidak ditemukan.");
      if (!res.ok) throw new Error((await res.text()) || "Gagal menyimpan");
      resetForm();
      loadRefetch();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus baris anggota ini?")) return;
    const res = await fetch(`${apiBase()}/api/anggota-partai/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      setErr((await res.text()) || "Gagal menghapus");
      return;
    }
    if (editing === id) resetForm();
    loadRefetch();
  }

  return (
    <div>
      <PageHeader title="Data Anggota" description="Pendukung · Penggerak · Pelopor per wilayah. Admin otomatis hanya melihat wilayah dalam dapilnya." badge={`${filtered.length} baris`} actions={<Button variant="ghost" onClick={loadRefetch}>Muat ulang</Button>} />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      <Card className="mb-3">
        <CardBody>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <WilayahSearch
                value={picked}
                onSelect={setPicked}
                label={editing ? "Wilayah (terkunci saat edit)" : "Cari & pilih wilayah"}
                disabled={editing !== null}
                placeholder="Cari wilayah (nama/kode)..."
              />
              {editing !== null && <p className="mt-1 text-[11px] text-slate-500">Wilayah tidak bisa diubah saat edit — hapus & buat baru untuk pindah wilayah.</p>}
            </div>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Partai
              <select value={partaiId} onChange={(e) => setPartaiId(e.target.value)} disabled={editing !== null} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-50">
                <option value="">— pilih partai —</option>
                {partai.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Pendukung
                <input value={pendukung} onChange={(e) => setPendukung(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Penggerak
                <input value={penggerak} onChange={(e) => setPenggerak(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Pelopor
                <input value={pelopor} onChange={(e) => setPelopor(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
            </div>
            <div className="flex items-end gap-2 md:col-span-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah data"}
              </Button>
              {editing !== null && (
                <Button type="button" variant="ghost" onClick={resetForm}>Batal</Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

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
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={7} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={7} className="py-8 text-center text-slate-500">Tidak ada data untuk filter ini.</Td>
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
                  <Td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Hapus</Button>
                    </div>
                  </Td>
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
