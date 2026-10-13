"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, fetchMe, type Me, apiBase } from "@/lib/auth";

type Partai = { id: number; nama: string; slug: string; aktif: boolean };

export default function AdminPartaiPage() {
  const [rows, setRows] = useState<Partai[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const [nama, setNama] = useState("");
  const [slug, setSlug] = useState("");
  const [aktif, setAktif] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setErr(null);
    fetch(`${apiBase()}/api/partai/`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat partai");
        return r.json() as Promise<Partai[]>;
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
    setNama("");
    setSlug("");
    setAktif(true);
    setEditing(null);
  }

  function startEdit(r: Partai) {
    setEditing(r.id);
    setNama(r.nama);
    setSlug(r.slug);
    setAktif(r.aktif);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !slug.trim()) {
      setErr("Nama dan slug wajib diisi.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const url = editing ? `${apiBase()}/api/partai/${editing}` : `${apiBase()}/api/partai/`;
      const method = editing ? "PUT" : "POST";
      const body = editing
        ? { nama: nama.trim(), slug: slug.trim(), aktif }
        : { nama: nama.trim(), slug: slug.trim(), aktif };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (res.status === 401) throw new Error("Belum login — masuk sebagai Super Admin.");
      if (res.status === 403) throw new Error("Hanya Super Admin yang dapat mengelola partai.");
      if (res.status === 409) throw new Error("Slug sudah terdaftar — gunakan slug lain.");
      if (!res.ok) throw new Error((await res.text()) || "Gagal menyimpan partai");
      resetForm();
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus partai ini? Data anggota/suara terkait bisa ikut terhapus (CASCADE).")) return;
    const res = await fetch(`${apiBase()}/api/partai/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      setErr((await res.text()) || "Gagal menghapus partai");
      return;
    }
    if (editing === id) resetForm();
    load();
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

      {isSuper ? (
        <Card className="mb-4">
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Nama partai
                <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Partai Contoh" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600">
                Slug
                <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="partai-contoh" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
              </label>
              <label className="flex items-end gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4" />
                <span className="pb-2">Aktif</span>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah"}
                </Button>
                {editing !== null && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </form>
          </CardBody>
        </Card>
      ) : (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Login sebagai Super Admin untuk menambah / mengubah / menghapus partai.
        </div>
      )}

      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Nama</Th>
              <Th>Slug</Th>
              <Th>Status</Th>
              {isSuper && <Th>Aksi</Th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={isSuper ? 5 : 4} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={isSuper ? 5 : 4} className="py-8 text-center text-slate-500">Belum ada data partai.</Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{r.id}</Td>
                  <Td className="font-medium">{r.nama}</Td>
                  <Td className="font-mono text-xs text-slate-600">{r.slug}</Td>
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
    </div>
  );
}
