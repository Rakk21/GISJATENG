"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { authHeaders, fetchMe, type Me, clearToken, apiBase } from "@/lib/auth";

export default function AdminPengaturanPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!pwd || pwd.length < 8) {
      setErr("Password minimal 8 karakter.");
      return;
    }
    if (!me) return;
    const res = await fetch(`${apiBase()}/api/users/${me.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ password: pwd }),
    });
    if (!res.ok) {
      setErr(await res.text());
      return;
    }
    setMsg("Password berhasil diubah. Silakan login ulang.");
    setPwd("");
  }

  return (
    <div>
      <PageHeader title="Pengaturan" description="Kelola akun & preferensi internal. Pengaturan global hanya Super Admin." badge={me?.role ?? "tamu"} />

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-bold">Akun saya</h2>
        </CardHeader>
        <CardBody>
          {!me ? (
            <p className="text-sm text-slate-600">
              Belum login — <a href="/admin/login" className="font-semibold underline">Masuk</a> untuk melihat & mengubah pengaturan.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold">Surel:</span> {me.surel}
              </div>
              <div>
                <span className="font-semibold">Nama:</span> {me.nama ?? "—"}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Peran:</span> <Badge tone={me.role === "super_admin" ? "violet" : "blue"}>{me.role}</Badge>
              </div>
              <div>
                <span className="font-semibold">Dapil:</span> {me.dapil_ids.length ? me.dapil_ids.map((id) => `#${id}`).join(", ") : me.role === "super_admin" ? "semua" : "—"}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-bold">Ganti password</h2>
          <p className="mt-1 text-xs text-slate-500">Hanya untuk akun sendiri. Super Admin juga bisa reset via Manajemen Pengguna.</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleChangePwd} className="flex max-w-sm flex-col gap-3">
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Password baru (min 8)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <Button type="submit" disabled={!me}>
              Simpan
            </Button>
            {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}
            {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                clearToken();
                location.href = "/admin/login";
              }}
            >
              Keluar & ke Login
            </Button>
            <a href="/" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Kembali ke Peta Publik
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-500">Internal only — dashboard ini tidak untuk publik. Warna netral & kontras tinggi untuk keterbacaan GIS.</p>
        </CardBody>
      </Card>
    </div>
  );
}
