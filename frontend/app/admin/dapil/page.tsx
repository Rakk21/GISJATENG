"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authHeaders, fetchMe, type Me, apiBase } from "@/lib/auth";

type Dapil = { id: number; kode: string; nama: string; jenis: string; tahun: number; wilayah_induk_id: number | null; aktif: boolean };

const JENIS_OPTIONS = ["ri", "provinsi", "kabupaten_kota"];

export default function AdminDapilPage() {
  const [rows, setRows] = useState<Dapil[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState("ri");
  const [tahun, setTahun] = useState("2024");
  const [aktif, setAktif] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    fetch(`${apiBase()}/api/dapil/`, { headers: authHeaders(), cache: "no-store" })
      .then((r) => {
        if (r.status === 401) throw new Error("Belum login — masuk dulu.");
        if (!r.ok) throw new Error("Gagal memuat dapil");
        return r.json() as Promise<Dapil[]>;
      })
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Gagal memuat"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMe().then(setMe);
    load();
  }, []);

  const isSuper = me?.role === "super_admin";

  function resetForm() {
    setKode("");
    setNama("");
    setJenis("ri");
    setTahun("2024");
    setAktif(true);
    setEditing(null);
  }

  function startEdit(r: Dapil) {
    setEditing(r.id);
    setKode(r.kode);
    setNama(r.nama);
    setJenis(r.jenis);
    setTahun(String(r.tahun));
    setAktif(r.aktif);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!kode.trim() || !nama.trim()) {
      setErr("Kode dan nama dapil wajib diisi.");
      return;
    }
    const tahunNum = Number(tahun);
    if (!Number.isInteger(tahunNum) || tahunNum < 1900 || tahunNum > 2100) {
      setErr("Tahun tidak valid.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const url = editing ? `${apiBase()}/api/dapil/${editing}` : `${apiBase()}/api/dapil/`;
      const method = editing ? "PUT" : "POST";
      const body = { kode: kode.trim(), nama: nama.trim(), jenis, tahun: tahunNum, aktif };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) throw new Error("Belum login.");
      if (res.status === 403) throw new Error("Hanya Super Admin yang dapat mengelola dapil.");
      if (!res.ok) throw new Error((await res.text()) || "Gagal menyimpan dapil");
      resetForm();
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus dapil ini? Mapping wilayah & akses pengguna terkait ikut berubah.")) return;
    const res = await fetch(`${apiBase()}/api/dapil/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      setErr((await res.text()) || "Gagal menghapus dapil");
      return;
    }
    if (editing === id) resetForm();
    load();
  }

  return (
    <div>
      <PageHeader
        title="Dapil"
        description="Admin hanya melihat & mengelola dapil yang diberikan. Super Admin kelola semua + mapping wilayah."
        badge={`${rows.length} dapil`}
        actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>}
      />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      {isSuper && (
        <Card className="mb-4">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Kode
                <input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="RI-2024-01" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Nama
                <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Dapil Jateng 1" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Jenis
                <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                  {JENIS_OPTIONS.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Tahun
                <input value={tahun} onChange={(e) => setTahun(e.target.value)} inputMode="numeric" placeholder="2024" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex items-end gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4" />
                <span className="pb-2">Aktif</span>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah dapil"}
                </Button>
                {editing !== null && (
                  <Button type="button" variant="ghost" onClick={resetForm}>Batal</Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Kode</Th>
              <Th>Nama</Th>
              <Th>Jenis</Th>
              <Th>Tahun</Th>
              <Th>Status</Th>
              {isSuper && <Th>Aksi</Th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={isSuper ? 6 : 5} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={isSuper ? 6 : 5} className="py-8 text-center text-slate-500">
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
                  {isSuper && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Hapus</Button>
                      </div>
                    </Td>
                  )}
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
