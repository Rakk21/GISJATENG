"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getToken, setToken, apiBase } from "@/lib/auth";
import { kabupatenKotaOptions } from "@/lib/atlas-data";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [dapilType, setDapilType] = useState<"ri" | "provinsi" | "kabupaten_kota">("ri");
  const [dapilNumber, setDapilNumber] = useState<string>("");
  const [kab, setKab] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (getToken()) router.replace("/"); }, [router]);

  const maxNum = dapilType === "ri" ? 10 : 13;
  const hint = dapilType === "ri" ? "Dapil RI Jateng I – X  →  1 sampai 10" : "Dapil Provinsi Jateng 1 – 13";
  const isKab = dapilType === "kabupaten_kota";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== password2) { setErr("Konfirmasi password tidak cocok"); return; }
    if (password.length < 8) { setErr("Password minimal 8 karakter"); return; }
    if (!isKab && !dapilNumber) { setErr("Pilih nomor dapil"); return; }
    if (isKab && !kab) { setErr("Pilih kabupaten/kota"); return; }

    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBase();
      const body: Record<string, unknown> = {
        name, email, password, password_confirmation: password2,
        dapil_type: dapilType,
      };
      if (isKab) body.kabupaten_kota = kab;
      else body.dapil_number = Number(dapilNumber);

      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "Register gagal";
        try { const j = await res.json(); msg = j.detail ?? j.message ?? (typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)) ?? msg; if (Array.isArray(j.detail)) msg = j.detail[0]?.msg ?? msg; } catch { const t = await res.text(); if (t) msg = t; }
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.access_token);
      // store scope for dashboard locking — mirip pengurus (dashboard terkunci ke wilayah register)
      try {
        if (isKab) localStorage.setItem("atlas_scope", JSON.stringify({ dapil_type: "kabupaten_kota", kabupaten_kota: kab }));
        else localStorage.setItem("atlas_scope", JSON.stringify({ dapil_type: dapilType, dapil_number: Number(dapilNumber) }));
      } catch {}
      router.push("/");
    } catch (e2) {
      const raw = e2 instanceof Error ? e2.message : String(e2);
      const isFetch = /failed to fetch|networkerror|load failed/i.test(raw);
      setErr(isFetch ? `Tidak dapat terhubung ke backend (${process.env.NEXT_PUBLIC_API_BASE_URL ?? apiBase()})` : raw);
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <main className="auth-shell auth-shell-wide" style={{ maxWidth: 580 }}>
        <Link className="auth-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span><strong>ATLAS</strong><small>JAWA TENGAH</small></span></Link>
        <section className="auth-card">
          <div className="auth-lock-badge"><i>🔒</i><span>AKSES INTERNAL — REGISTER DIPERLUKAN</span></div>
          <p className="eyebrow">AKSES INTERNAL</p>
          <h1>Pilih wilayah kerjamu.</h1>
          <p className="auth-intro">Website ini <b>internal</b> — wajib login dulu. Pilih <b>salah satu</b> saja — Dapil RI, Dapil Provinsi, atau Kabupaten/Kota. Setelah daftar &amp; login, dashboard akan <b>terkunci</b> hanya menampilkan wilayah pilihanmu.</p>
          {err && <div className="form-error">{err}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <label>Nama lengkap<input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></label>
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
              <label>Ulangi password<input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required /></label>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 0 }}>
              <legend style={{ font: "600 10px 'DM Mono',monospace", letterSpacing: ".1em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>Wajib pilih satu scope</legend>
              <div className="scope-choice">
                <label><input type="radio" name="dapil_type" value="ri" checked={dapilType === "ri"} onChange={() => setDapilType("ri")} /> Dapil RI <small>1 – 10</small></label>
                <label><input type="radio" name="dapil_type" value="provinsi" checked={dapilType === "provinsi"} onChange={() => setDapilType("provinsi")} /> Dapil Provinsi <small>1 – 13</small></label>
                <label><input type="radio" name="dapil_type" value="kabupaten_kota" checked={dapilType === "kabupaten_kota"} onChange={() => setDapilType("kabupaten_kota")} /> Kabupaten / Kota <small>35 wilayah</small></label>
              </div>

              <div className="scope-panel" hidden={isKab}>
                <label>Nomor dapil
                  <select value={dapilNumber} onChange={(e) => setDapilNumber(e.target.value)} required={!isKab}>
                    <option value="">Pilih nomor</option>
                    {Array.from({ length: maxNum }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <p className="scope-hint">{hint}</p>
              </div>

              <div className="scope-panel" hidden={!isKab}>
                <label>Kabupaten / Kota di Jawa Tengah
                  <select value={kab} onChange={(e) => setKab(e.target.value)} required={isKab}>
                    <option value="">Pilih kabupaten / kota</option>
                    {kabupatenKotaOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <p className="scope-hint">Hanya 1 kabupaten/kota — mis. Kabupaten Banyumas atau Kota Semarang.</p>
              </div>
            </fieldset>

            <button type="submit" className="auth-submit" disabled={loading}>{loading ? "Memproses..." : <>Buat akun <span>↗</span></>}</button>
          </form>
          <p className="auth-switch">Sudah punya akun? <Link href="/login">Masuk di sini</Link></p>
        </section>
      </main>
    </div>
  );
}
