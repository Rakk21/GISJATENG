"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, setToken, apiBase } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@webgis.local");
  const [password, setPassword] = useState("superadmin123");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
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
      setToken(data.access_token);
      router.push("/");
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : String(e2);
      const isFetch = /failed to fetch|networkerror|load failed/i.test(raw);
      setErr(isFetch ? `Tidak dapat terhubung ke backend (${process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBase()}). Pastikan backend jalan di http://127.0.0.1:8080` : raw);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <main className="auth-shell">
        <Link className="auth-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span><strong>ATLAS</strong><small>JAWA TENGAH</small></span></Link>
        <section className="auth-card">
          <div className="auth-lock-badge"><i>🔒</i><span>AKSES INTERNAL — LOGIN DIPERLUKAN</span></div>
          <p className="eyebrow">AKSES INTERNAL</p>
          <h1>Selamat datang kembali.</h1>
          <p className="auth-intro">Website ini berisi <b>informasi internal</b>. Silakan login terlebih dahulu untuk mengakses dashboard — data ditampilkan sesuai wilayah (dapil / kabupaten/kota) yang kamu pilih saat register.</p>
          {err && <div className="form-error">{err}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
            <label style={{ position: "relative" }}>
              <span style={{ display: "flex", justifyContent: "space-between" }}>Password<button type="button" onClick={() => setShow((v) => !v)} style={{ background: "none", border: 0, color: "var(--muted)", font: "600 10px 'DM Mono',monospace", cursor: "pointer", textDecoration: "underline" }}>{show ? "Sembunyikan" : "Tampilkan"}</button></span>
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label className="check-row"><input type="checkbox" defaultChecked /> Ingat saya</label>
            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Memproses..." : <>Masuk ke dashboard <span>↗</span></>}</button>
          </form>
          <p className="auth-switch">Belum punya akun? <Link href="/register">Daftar sekarang</Link></p>
          <p className="auth-switch auth-secondary-link"><Link href="/admin/login">Login khusus admin →</Link></p>
          <p className="auth-switch" style={{ marginTop: 6 }}><Link href="/">← Kembali ke peta publik</Link></p>
        </section>
      </main>
    </div>
  );
}
