"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, authHeaders } from "@/lib/auth";

export type WilayahSearchResult = {
  id: number;
  kode_kemendagri: string;
  nama: string;
  tingkat: string;
  parent_id: number | null;
  parent_nama: string | null;
  parent_tingkat: string | null;
  breadcrumb: string;
  dapil_ids: number[];
};

type Props = {
  value?: WilayahSearchResult | null;
  onSelect: (w: WilayahSearchResult | null) => void;
  tingkat?: string | null;
  dapilId?: number | null;
  kabupatenKota?: string | null;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  limit?: number;
  className?: string;
  id?: string;
};

function tingkatLabel(t: string) {
  if (t === "provinsi") return "Provinsi";
  if (t === "kabupaten_kota") return "Kab/Kota";
  if (t === "kecamatan") return "Kecamatan";
  if (t === "desa") return "Desa";
  return t;
}

export default function WilayahSearch({
  value,
  onSelect,
  tingkat,
  dapilId,
  kabupatenKota,
  placeholder,
  label,
  disabled,
  limit = 20,
  className = "",
  id,
}: Props) {
  const [q, setQ] = useState(value?.nama ?? "");
  const [results, setResults] = useState<WilayahSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<number>(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // sync external value -> input
  useEffect(() => {
    setQ(value?.nama ?? "");
  }, [value?.id, value?.nama]);

  // outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fetchSearch = useCallback(
    async (term: string) => {
      const t = term.trim();
      if (t.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: t, limit: String(limit) });
        if (tingkat) params.set("tingkat", tingkat);
        if (dapilId != null) params.set("dapil_id", String(dapilId));
        if (kabupatenKota) params.set("kabupaten_kota", kabupatenKota);
        const base = apiBase();
        const headers: HeadersInit = authHeaders();
        const res = await fetch(`${base}/api/wilayah/search?${params.toString()}`, {
          headers,
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as WilayahSearchResult[];
        if (!ac.signal.aborted) {
          setResults(j);
          setOpen(j.length > 0);
          setFocused(j.length ? 0 : -1);
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (!ac.signal.aborted) {
          setResults([]);
          setOpen(false);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [tingkat, dapilId, kabupatenKota, limit]
  );

  // debounce q
  useEffect(() => {
    if (value && q === value.nama) return; // selected stays
    const timer = setTimeout(() => {
      void fetchSearch(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, fetchSearch, value]);

  // when filter changes while box open, re-fetch
  useEffect(() => {
    if (open && q.trim().length >= 2) void fetchSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tingkat, dapilId, kabupatenKota]);

  function handlePick(r: WilayahSearchResult) {
    setQ(r.nama);
    setOpen(false);
    setResults([]);
    setFocused(-1);
    onSelect(r);
  }

  function handleClear() {
    setQ("");
    setResults([]);
    setOpen(false);
    onSelect(null);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" && results.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => (f + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => (f - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      if (focused >= 0 && results[focused]) {
        e.preventDefault();
        handlePick(results[focused]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const scopeHint = kabupatenKota
    ? `di ${kabupatenKota}`
    : dapilId != null
      ? `dapil #${dapilId}`
      : null;

  const hasDup = (() => {
    const c = new Map<string, number>();
    for (const r of results) c.set(r.nama.toLowerCase(), (c.get(r.nama.toLowerCase()) ?? 0) + 1);
    return [...c.values()].some((n) => n > 1);
  })();

  return (
    <div ref={wrapRef} className={`wilayah-search ${className}`} style={{ position: "relative" }}>
      {label ? (
        <label htmlFor={id} style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "var(--adm-muted, #6b6f6d)" }}>
          {label} {scopeHint ? <span style={{ fontWeight: 400, color: "var(--adm-faint, #9ba09e)" }}>· {scopeHint}</span> : null}
        </label>
      ) : null}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px 8px 32px",
          border: "1px solid var(--adm-border, #e4e4e3)",
          borderRadius: 10,
          background: disabled ? "var(--adm-bg, #f4f4f3)" : "var(--adm-surface, #fff)",
          boxShadow: open ? "0 8px 24px rgba(0,0,0,0.08)" : undefined,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--adm-faint, #9ba09e)",
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          id={id}
          value={q}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            if (!v.trim()) {
              setResults([]);
              setOpen(false);
              onSelect(null);
            }
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
            else if (q.trim().length >= 2) void fetchSearch(q);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? (tingkat ? `Cari ${tingkatLabel(tingkat)}...` : "Cari wilayah (nama/kode)...")}
          autoComplete="off"
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            background: "transparent",
            fontSize: 13,
            color: "var(--adm-ink, #111312)",
          }}
        />
        {loading ? (
          <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--adm-border)", borderTopColor: "var(--adm-accent, #1d4033)", display: "inline-block", animation: "spin 0.7s linear infinite", flex: "0 0 14px" }} />
        ) : q ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Hapus pencarian"
            style={{
              flex: "0 0 auto",
              width: 22,
              height: 22,
              display: "grid",
              placeItems: "center",
              border: 0,
              borderRadius: 999,
              background: "var(--adm-bg, #f4f4f3)",
              color: "var(--adm-muted)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: "auto",
            padding: 6,
            border: "1px solid var(--adm-border, #e4e4e3)",
            borderRadius: 12,
            background: "var(--adm-surface, #fff)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
          }}
        >
          {hasDup ? (
            <div style={{ padding: "6px 8px 8px", fontSize: 11, color: "var(--adm-faint)", borderBottom: "1px solid var(--adm-border)", marginBottom: 6 }}>
              Nama sama → pilih sesuai <b style={{ color: "var(--adm-ink)" }}>wilayah induk</b> {kabupatenKota || dapilId != null ? "(sudah difilter)" : "(breadcrumb membedakan)"}.
            </div>
          ) : null}
          {results.map((r, idx) => {
            const isFocused = idx === focused;
            return (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={value?.id === r.id}
                onClick={() => handlePick(r)}
                onMouseEnter={() => setFocused(idx)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 10px",
                  border: 0,
                  borderRadius: 8,
                  background: isFocused ? "var(--adm-bg, #f4f4f3)" : "transparent",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <b style={{ fontSize: 13, fontWeight: 600, color: "var(--adm-ink)" }}>{r.nama}</b>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        border: "1px solid var(--adm-border)",
                        background: "var(--adm-bg)",
                        fontSize: 10,
                        fontWeight: 600,
                        color: "var(--adm-muted)",
                        textTransform: "uppercase",
                        letterSpacing: 0.04,
                      }}
                    >
                      {tingkatLabel(r.tingkat)}
                    </span>
                    <span style={{ fontFamily: "var(--adm-font-mono, monospace)", fontSize: 10, color: "var(--adm-faint)" }}>{r.kode_kemendagri}</span>
                  </span>
                  <small style={{ display: "block", marginTop: 3, fontSize: 11, color: "var(--adm-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.breadcrumb}
                  </small>
                </span>
                <span style={{ flex: "0 0 auto", fontSize: 11, fontWeight: 600, color: isFocused ? "var(--adm-accent)" : "var(--adm-faint)" }}>Pilih ↗</span>
              </button>
            );
          })}
          <div style={{ padding: "6px 8px 2px", fontSize: 11, color: "var(--adm-faint)" }}>
            {results.length} hasil · hanya wilayah {kabupatenKota ? `dalam ${kabupatenKota}` : dapilId != null ? `dalam dapil #${dapilId}` : "sesuai hak dapil Anda"}.
          </div>
        </div>
      ) : null}

      {value ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ padding: "3px 8px", borderRadius: 999, border: "1px solid #c5d8cc", background: "var(--adm-accent-lt, #eaf1ed)", color: "var(--adm-accent)", fontSize: 11, fontWeight: 600 }}>
            Terpilih: {value.breadcrumb} · {value.kode_kemendagri}
          </span>
          <button
            type="button"
            onClick={handleClear}
            style={{ padding: "3px 8px", borderRadius: 999, border: "1px solid var(--adm-border)", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Ganti
          </button>
        </div>
      ) : null}
    </div>
  );
}
