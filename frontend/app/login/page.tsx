"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, setToken, apiBase } from "@/lib/auth";

const DEMO = [
  { label: "Super Admin", surel: "admin@webgis.local", pass: "superadmin123", note: "Semua dapil" },
  { label: "Admin Jateng 1", surel: "user@webgis.local", pass: "admin123", note: "Hanya dapil 1" },
  { label: "Admin Jateng 2", surel: "rak@gmail.com", pass: "rak123", note: "Hanya dapil 2" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [surel, setSurel] = useState<string>(DEMO[0].surel);
  const [sandi, setSandi] = useState<string>(DEMO[0].pass);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/admin");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? `${apiBase()}`;
      const body = new URLSearchParams({ username: surel, password: sandi });
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        let msg = "Login gagal";
        try {
          const j = await res.json();
          msg = j.detail ?? j.message ?? msg;
        } catch {
          const t = await res.text();
          if (t) msg = t;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.access_token);
      router.push("/admin");
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : String(e2);
      const isFetch = /failed to fetch|networkerror|load failed/i.test(raw);
      setErr(isFetch ? `Tidak dapat terhubung ke backend (${process.env.NEXT_PUBLIC_API_BASE_URL ?? `${apiBase()}`}). Pastikan backend jalan di http://127.0.0.1:8080` : raw);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(idx: number) {
    setSurel(DEMO[idx].surel);
    setSandi(DEMO[idx].pass);
    setErr(null);
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        {/* Left: editorial panel — gov/GIS */}
        <div className="login-left">
          <Link href="/" className="login-brand">
            <span className="login-mark" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>WebGIS Jawa Tengah</strong>
              <small>Sistem Informasi Geografis · Internal</small>
            </span>
          </Link>

          <div className="login-hero">
            <p className="login-kicker">Admin Internal — bukan public website</p>
            <h1>
              Masuk untuk
              <br />
              kelola wilayah
              <br />
              <em>per dapil.</em>
            </h1>
            <p className="login-copy">
              Super Admin melihat semua dapil & kelola permission.
              <br />
              Admin hanya mengelola dapil yang diberikan.
            </p>
          </div>

          <div className="login-foot">
            <span>Internal only</span>
            <span>·</span>
            <Link href="/">Lihat peta publik</Link>
          </div>
        </div>

        {/* Right: form card */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-card-head">
              <h2>Masuk</h2>
              <p>Gunakan surel & sandi internal Anda.</p>
            </div>

            <div className="login-demo" role="group" aria-label="Akun demo">
              <span className="login-demo-label">Isi cepat (demo)</span>
              <div className="login-demo-row">
                {DEMO.map((d, i) => (
                  <button key={d.surel} type="button" onClick={() => fillDemo(i)} className="login-demo-btn">
                    <strong>{d.label}</strong>
                    <small>{d.surel}</small>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <label className="login-field">
                <span>Surel</span>
                <input type="email" autoComplete="email" value={surel} onChange={(e) => setSurel(e.target.value)} placeholder="nama@webgis.local" required />
              </label>

              <label className="login-field">
                <div className="login-field-row">
                  <span>Sandi</span>
                  <button type="button" className="login-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? "Sembunyikan sandi" : "Tampilkan sandi"}>
                    {show ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <input type={show ? "text" : "password"} autoComplete="current-password" value={sandi} onChange={(e) => setSandi(e.target.value)} placeholder="••••••••" required />
              </label>

              {err && (
                <div className="login-error" role="alert">
                  {err}
                </div>
              )}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Memproses..." : "Masuk ke Admin"}
              </button>

              <p className="login-hint">
                Lupa sandi? Hubungi Super Admin di <Link href="/admin/pengguna">Manajemen Pengguna</Link>.
              </p>
            </form>

            <div className="login-divider">
              <span>atau</span>
            </div>

            <div className="login-alt">
              <Link href="/" className="login-alt-link">
                ← Kembali ke peta publik
              </Link>
              <Link href="/admin" className="login-alt-link muted">
                Buka dashboard (perlu login) →
              </Link>
            </div>
          </div>

          <p className="login-legal">© WebGIS Jawa Tengah · Dashboard internal — data & menu otomatis mengikuti permission dapil Anda.</p>
        </div>
      </div>
    </div>
  );
}
