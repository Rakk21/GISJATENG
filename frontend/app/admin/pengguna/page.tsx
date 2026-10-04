"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, fetchMe, apiBase } from "@/lib/auth";

type User = { id: number; surel: string; nama: string | null; peran: string; role: string; dapil_ids: number[] };
type Dapil = { id: number; kode: string; nama: string };

export default function AdminPenggunaPage() {
  const router = useRouter();
  const [rows, setRows] = useState<User[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [surel, setSurel] = useState("");
  const [nama, setNama] = useState("");
  const [peran, setPeran] = useState("admin");
  const [pwd, setPwd] = useState("");
  const [dapilIds, setDapilIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setErr(null);
    Promise.all([
      fetch(`${apiBase()}/api/users/`, { headers: authHeaders(), cache: "no-store" }).then((r) => {
        if (r.status === 403) throw new Error("Hanya Super Admin dapat mengelola pengguna.");
        if (r.status === 401) throw new Error("Belum login.");
        if (!r.ok) throw new Error("Gagal memuat pengguna");
        return r.json();
      }),
      fetch(`${apiBase()}/api/dapil/`, { headers: authHeaders(), cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([users, daps]) => {
        setRows(users);
        setDapils(daps);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMe().then((m) => {
      if (!m || m.role !== "super_admin") {
        setErr("Halaman ini hanya untuk Super Admin.");
        return;
      }
      load();
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const url = editing ? `${apiBase()}/api/users/${editing}` : `${apiBase()}/api/users/`;
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = editing
        ? { nama, peran, dapil_ids: dapilIds, ...(pwd ? { password: pwd } : {}) }
        : { surel, nama, peran, password: pwd, dapil_ids: dapilIds };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await res.text());
      setSurel("");
      setNama("");
      setPwd("");
      setDapilIds([]);
      setEditing(null);
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus pengguna ini?")) return;
    const res = await fetch(`${apiBase()}/api/users/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    load();
  }

  function startEdit(u: User) {
    setEditing(u.id);
    setSurel(u.surel);
    setNama(u.nama ?? "");
    setPeran(u.peran);
    setDapilIds(u.dapil_ids);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <PageHeader title="Manajemen Pengguna" description="Hanya Super Admin. Kelola akun & permission dapil — Admin hanya dapat dapil yang diberikan." badge="Super Admin only" />

      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      <Card className="mb-4">
        <CardBody>
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Surel
              <input value={surel} onChange={(e) => setSurel(e.target.value)} disabled={!!editing} placeholder="admin@baru.local" className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Nama
              <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Peran
              <select value={peran} onChange={(e) => setPeran(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Password {editing ? "(kosongkan jika tidak ganti)" : ""}
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={editing ? "••••" : "min 8 karakter"} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <div className="md:col-span-2">
              <div className="text-xs font-semibold text-slate-600">Dapil yang diberikan</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {dapils.map((d) => {
                  const on = dapilIds.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => setDapilIds((prev) => (on ? prev.filter((x) => x !== d.id) : [...prev, d.id]))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
                      {d.kode}
                    </button>
                  );
                })}
                {dapils.length === 0 && <span className="text-xs text-slate-500">Belum ada dapil.</span>}
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah pengguna"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={() => { setEditing(null); setSurel(""); setNama(""); setPwd(""); setDapilIds([]); }}>
                  Batal
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={load}>
                Muat ulang
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <TableWrap>
        <table className="w-full">
          <thead>
            <tr>
              <Th>Surel</Th>
              <Th>Nama</Th>
              <Th>Peran</Th>
              <Th>Dapil</Th>
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-slate-500">Belum ada pengguna atau akses ditolak.</Td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <Td className="font-mono text-xs">{u.surel}</Td>
                  <Td>{u.nama ?? "—"}</Td>
                  <Td>
                    <Badge tone={u.role === "super_admin" ? "violet" : u.role === "admin" ? "blue" : "slate"}>{u.role}</Badge>
                  </Td>
                  <Td className="text-xs">{u.dapil_ids.length ? u.dapil_ids.map((id) => `#${id}`).join(", ") : "—"}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(u)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>
                        Hapus
                      </Button>
                    </div>
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
