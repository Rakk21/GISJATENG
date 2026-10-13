"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TableWrap, Th, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, apiBase } from "@/lib/auth";
import WilayahSearch, { type WilayahSearchResult } from "@/components/wilayah/WilayahSearch";

type Row = { id: number; wilayah_id: number; wilayah_nama?: string | null; partai_id: number; partai_nama?: string | null; suara: number; level: string };
type Partai = { id: number; nama: string; slug: string; aktif: boolean };
const n = new Intl.NumberFormat("id-ID");

const LEVEL_OPTIONS = ["kab_kota", "kecamatan"];

export default function AdminSuaraPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [partai, setPartai] = useState<Partai[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [picked, setPicked] = useState<WilayahSearchResult | null>(null);
  const [partaiId, setPartaiId] = useState("");
  const [suara, setSuara] = useState("");
  const [level, setLevel] = useState("kab_kota");
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("webgis_token");
    const url = hasToken ? `${apiBase()}/api/suara-partai/admin` : `${apiBase()}/api/suara-partai/`;
    fetch(url, { headers: hasToken ? authHeaders() : {}, cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat data suara");
        return r.json() as Promise<Row[]>;
      })
      .then(setRows)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Gagal memuat"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    fetch(`${apiBase()}/api/partai/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((j: Partai[]) => setPartai(j))
      .catch(() => {});
  }, [load]);

  const filtered = rows.filter((r) => !q || `${r.wilayah_nama ?? ""} ${r.partai_nama ?? ""} ${r.level}`.toLowerCase().includes(q.toLowerCase()));

  function resetForm() {
    setPicked(null);
    setPartaiId("");
    setSuara("");
    setLevel("kab_kota");
    setEditing(null);
  }

  function startEdit(r: Row) {
    setEditing(r.id);
    setPicked(null);
    setPartaiId(String(r.partai_id));
    setSuara(String(r.suara));
    setLevel(r.level);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const pid = Number(partaiId);
    const s = suara.trim() === "" ? null : Number(suara);
    if (!Number.isInteger(pid) || pid <= 0) {
      setErr("Pilih partai terlebih dahulu.");
      return;
    }
    if (s === null || !Number.isInteger(s) || s < 0) {
      setErr("Jumlah suara harus bilangan bulat >= 0.");
      return;
    }
    if (!LEVEL_OPTIONS.includes(level)) {
      setErr("Level tidak valid.");
      return;
    }
    if (!editing && !picked) {
      setErr("Cari & pilih wilayah terlebih dahulu.");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${apiBase()}/api/suara-partai/${editing}` : `${apiBase()}/api/suara-partai/`;
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = editing
        ? { suara: s, level }
        : { wilayah_id: picked!.id, partai_id: pid, suara: s, level };
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
      load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Hapus baris suara ini?")) return;
    const res = await fetch(`${apiBase()}/api/suara-partai/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) {
      setErr((await res.text()) || "Gagal menghapus");
      return;
    }
    if (editing === id) resetForm();
    load();
  }

  return (
    <div>
      <PageHeader title="Data Suara" description="Perolehan suara per wilayah & partai (Election 2024). Terfilter otomatis per dapil untuk Admin." badge={`${filtered.length} baris`} actions={<Button variant="ghost" onClick={load}>Muat ulang</Button>} />
      {err && <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{err}</div>}

      <Card className="mb-3">
        <CardBody>
          <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
            <div>
              <WilayahSearch
                value={picked}
                onSelect={setPicked}
                label={editing ? "Wilayah (terkunci saat edit)" : "Cari & pilih wilayah"}
                disabled={editing !== null}
                placeholder="Cari wilayah (nama/kode)..."
              />
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
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Suara
              <input value={suara} onChange={(e) => setSuara(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              Level
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2 md:col-span-4">
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
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center">Memuat...</Td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-slate-500">Tidak ada data.</Td>
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
    </div>
  );
}
