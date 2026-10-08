"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, setToken, apiBase } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@webgis.local");
  const [password, setPassword] = useState("superadmin123");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/admin");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBase();
      const body = new URLSearchParams({ username: email, password });
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        let msg = "Login gagal";
        try { const j = await res.json(); msg = j.detail ?? j.message ?? msg; } catch { const t = await res.text(); if (t) msg = t; }
        throw new Error(msg);
      }
      const data = await res.json();
      // verify role after login
      const meRes = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${data.access_token}` } });
      if (!meRes.ok) throw new Error("Gagal memverifikasi role");
      const me = await meRes.json();
      if (me.role !== role) throw new Error(`Role yang dipilih (${role}) tidak sesuai dengan akun (role: ${me.role}).`);
      setToken(data.access_token);
      router.push(role === "super_admin" ? "/admin/pengguna" : "/admin");
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : String(e2);
      const isFetch = /failed to fetch|networkerror|load failed/i.test(raw);
      setErr(isFetch ? `Tidak dapat terhubung ke backend (${process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBase()}).` : raw);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <main className="auth-shell">
        <Link className="auth-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span><strong>ATLAS</strong><small>JAWA TENGAH</small></span></Link>
        <section className="auth-card">
          <p className="eyebrow">ADMIN CONTROL ROOM</p>
          <h1>Masuk ke ruang kerja.</h1>
          <p className="auth-intro">Akses analitik, kualitas data, dan pengaturan wilayah hanya untuk akun admin.</p>
          {err && <div className="form-error">{err}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <label>Email admin<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
            <label>
              <span style={{ display: "flex", justifyContent: "space-between" }}>Password<button type="button" onClick={() => setShow((v) => !v)} style={{ background: "none", border: 0, color: "var(--muted)", font: "600 10px 'DM Mono',monospace", cursor: "pointer", textDecoration: "underline" }}>{show ? "Sembunyikan" : "Tampilkan"}</button></span>
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label>Masuk sebagai
              <select value={role} onChange={(e) => setRole(e.target.value as any)} required>
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Ingat perangkat ini</label>
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Memproses..." : <>Masuk sebagai admin <span>↗</span></>}</button>
          </form>
          <p className="auth-switch">Bukan akun admin? <Link href="/login">Login user</Link></p>
          <p className="auth-switch" style={{ marginTop: 6 }}><Link href="/">← Kembali ke peta publik</Link></p>
        </section>
      </main>
    </div>
  );
}
