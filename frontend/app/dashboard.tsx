"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import { atlasRegions, atlasMembers, getAtlasTotals, filterRegionsByScope, type AtlasRegion } from "@/lib/atlas-data";
import { fetchMe, clearToken, getToken, apiBase, type Me } from "@/lib/auth";

type WilayahRincian = {
  wilayah: { id: number; nama: string; tingkat: string; kode_kemendagri: string; parent_id: number | null; synthetic?: boolean };
  total_partai: number;
  jumlah_partai_ada: number;
  partai: { partai_id: number; partai_nama: string; ada: boolean; enum_ada: string; jumlah_pendukung: number; jumlah_penggerak: number; jumlah_pelopor: number; ada_pendukung: boolean; ada_penggerak: boolean; ada_pelopor: boolean }[];
  peran: { total_pendukung: number; total_penggerak: number; total_pelopor: number; ada_pendukung: boolean; ada_penggerak: boolean; ada_pelopor: boolean; enum_pendukung: string; enum_penggerak: string; enum_pelopor: string };
  kepala_desa: { ada: boolean; enum_ada: string; jumlah: number; detail: { id: number; ada: boolean; partai_nama: string | null }[] };
  komunitas_senam: { total_komunitas: number; ada: boolean; enum_ada: string; detail: { id: number; jumlah_komunitas: number; partai_nama: string | null; keterangan: string | null }[] };
  tokoh_partai: { total_tokoh: number; ada: boolean; enum_ada: string; daftar: { id: number; jenis_tokoh: string; jumlah_tokoh: number; partai_nama: string | null; keterangan: string | null }[] };
};

const n = new Intl.NumberFormat("id-ID");
function initials(name: string) { return name.split(" ").map((p) => p[0]).slice(0, 2).join(""); }
function shortName(name: string) { return name.replace("Kabupaten ", "Kab. ").replace("Kota ", "Kota "); }

/* ── normalize untuk cocokkan KABUPATEN geojson (uppercase, slash) dengan atlasRegions ──
   Fix: "Kota Semarang" vs "Kabupaten Semarang" / "SEMARANG" tidak boleh jadi "semarang" yang sama.
   Kita bedakan tipe kota/kabupaten. Geo tanpa prefix (mis "Semarang" di kota.geojson KODE_KK 33.22)
   dipetakan ke Kabupaten Semarang; "Kota Semarang" baru ke Kota Semarang. */
function parseKab(value: string): { type: "kota" | "kabupaten" | null; base: string } {
  const first = value.split("/")[0].trim().toLowerCase();
  let t: "kota" | "kabupaten" | null = null;
  let rest = first;
  if (rest.startsWith("kabupaten ")) { t = "kabupaten"; rest = rest.slice(10); }
  else if (rest.startsWith("kab. ")) { t = "kabupaten"; rest = rest.slice(5); }
  else if (rest.startsWith("kab ")) { t = "kabupaten"; rest = rest.slice(4); }
  else if (rest.startsWith("kota ")) { t = "kota"; rest = rest.slice(5); }
  const base = rest.replace(/[^a-z0-9]/g, "");
  return { type: t, base };
}
function isSameKabKota(geoName: string, atlasName: string): boolean {
  const g = parseKab(geoName);
  const a = parseKab(atlasName);
  if (!g.base || !a.base) return false;
  if (g.type && a.type) return g.type === a.type && g.base === a.base;
  if (!g.type && a.type) return a.type === "kabupaten" && g.base === a.base; // "Semarang" -> Kabupaten Semarang
  if (g.type && !a.type) return g.base === a.base;
  return g.base === a.base;
}
function normalizeKab(value: string): string {
  const p = parseKab(value);
  return (p.type ? p.type + " " : "") + p.base;
}
function normalizeGeoKab(value: string): string {
  const p = parseKab(value);
  return (p.type ? p.type + " " : "") + p.base;
}
function findRegionByGeoName(geoName: string): AtlasRegion | null {
  // prioritas exact tipe+base, fallback base-only untuk legacy
  const exact = atlasRegions.find((r) => isSameKabKota(geoName, r.name));
  if (exact) return exact;
  const g = parseKab(geoName);
  return atlasRegions.find((r) => parseKab(r.name).base === g.base) ?? null;
}

const MAP_URL = "/geojson/kota.geojson";

/* choropleth gradiasi — interpolasi kontinu, makin gelap = makin banyak anggota.
   Light #dbe8dd → Dark #1d4033. Nilai t dinormalisasi terhadap min/max wilayah yang SEDANG ditampilkan
   (global / dapil terpilih / dapil+klik), jadi gradasi selalu relatif terhadap filter aktif. */
const GRAD_LIGHT = { r: 0xdb, g: 0xe8, b: 0xdd };
const GRAD_DARK = { r: 0x1d, g: 0x40, b: 0x33 };
function fillForMembers(members: number, min: number, max: number): string {
  const t = max === min ? 0.5 : Math.max(0, Math.min(1, (members - min) / (max - min)));
  const r = Math.round(GRAD_LIGHT.r + (GRAD_DARK.r - GRAD_LIGHT.r) * t);
  const g = Math.round(GRAD_LIGHT.g + (GRAD_DARK.g - GRAD_LIGHT.g) * t);
  const b = Math.round(GRAD_LIGHT.b + (GRAD_DARK.b - GRAD_LIGHT.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [scopeKey, setScopeKey] = useState(0);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [regionQuery, setRegionQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [regionResults, setRegionResults] = useState<AtlasRegion[]>([]);
  const [regionBoxOpen, setRegionBoxOpen] = useState(false);
  const [memberBoxOpen, setMemberBoxOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [rincian, setRincian] = useState<WilayahRincian | null>(null);
  const [rincianLoading, setRincianLoading] = useState(false);
  const [rincianError, setRincianError] = useState<string | null>(null);
  const [level, setLevel] = useState<"kab" | "kec">("kab");
  const [kecGeo, setKecGeo] = useState<any | null>(null);
  const [kecLoading, setKecLoading] = useState(false);
  const [kecSelected, setKecSelected] = useState<string | null>(null);
  const [kecRincian, setKecRincian] = useState<WilayahRincian | null>(null);
  const [kecRincianLoading, setKecRincianLoading] = useState(false);
  const [kecRincianError, setKecRincianError] = useState<string | null>(null);

  const mapRef = useRef<import("leaflet").Map | null>(null);
  const geoRef = useRef<import("leaflet").GeoJSON | null>(null);

  /* ── guard: wajib login dulu seperti pengurus Route::middleware('auth') ── */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    fetchMe().then((m) => {
      if (!m) {
        clearToken();
        localStorage.removeItem("atlas_scope");
        router.replace("/login");
        return;
      }
      setMe(m);
      setAuthChecked(true);
    });
  }, [router, scopeKey]);

  useEffect(() => {
    const onStorage = () => setScopeKey((k) => k + 1);
    window.addEventListener("storage", onStorage);
    // sinkron atlas_scope dari server saat pertama load (agar lock persist di device lain)
    if (me?.dapil_type) {
      try {
        const cur = localStorage.getItem("atlas_scope");
        const serverScope = me.dapil_type === "kabupaten_kota" && me.kabupaten_kota
          ? JSON.stringify({ dapil_type: "kabupaten_kota", kabupaten_kota: me.kabupaten_kota })
          : me.dapil_number ? JSON.stringify({ dapil_type: me.dapil_type, dapil_number: me.dapil_number }) : null;
        if (serverScope && cur !== serverScope) { localStorage.setItem("atlas_scope", serverScope); setScopeKey((k)=>k+1); }
      } catch {}
    }
    return () => window.removeEventListener("storage", onStorage);
  }, [me]);

  // scope prioritas: server (pengguna.dapil_type) > localStorage (fallback device)
  const scope = useMemo(() => {
    if (me?.dapil_type) {
      if (me.dapil_type === "kabupaten_kota" && me.kabupaten_kota) return { dapil_type: "kabupaten_kota" as const, kabupaten_kota: me.kabupaten_kota };
      if ((me.dapil_type === "ri" || me.dapil_type === "provinsi") && me.dapil_number) return { dapil_type: me.dapil_type as "ri" | "provinsi", dapil_number: me.dapil_number };
    }
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("atlas_scope") : null;
      if (!raw) return null;
      return JSON.parse(raw) as { dapil_type: "ri" | "provinsi" | "kabupaten_kota"; dapil_number?: number; kabupaten_kota?: string };
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, scopeKey]);

  const { filtered: regions, label: selectedDapilLabel } = useMemo(() => {
    if (!scope) return { filtered: atlasRegions, label: null as string | null };
    const { filtered, label } = filterRegionsByScope(atlasRegions, scope);
    return { filtered, label };
  }, [scope]);

  const isScoped = !!scope;
  const isKabKota = scope?.dapil_type === "kabupaten_kota";

  const dapilInfo = useMemo(() => {
    if (!scope) return null;
    const { dapilInfo: info } = filterRegionsByScope(atlasRegions, scope);
    if (!info) return null;
    if (isKabKota) {
      const m = atlasRegions.find((r) => r.name === scope.kabupaten_kota);
      if (!m) return info;
      return { ...info, type: m.type, kabupaten_kota: m.name, dapil_ri: m.dapil_ri, dapil_provinsi: m.dapil_provinsi, kecamatan: m.kecamatan, desa: m.desa, members: m.members };
    }
    return info;
  }, [scope, isKabKota]);

  const totals = useMemo(() => getAtlasTotals(regions), [regions]);
  const allowedNames = useMemo(() => new Set(regions.map((r) => r.name)), [regions]);
  const visibleMembers = useMemo(() => atlasMembers.filter((m) => allowedNames.has(m.region)), [allowedNames]);

  const selectedRegion: AtlasRegion | null = useMemo(() => {
    if (!selectedName) return null;
    return regions.find((r) => r.name === selectedName) ?? findRegionByGeoName(selectedName) ?? null;
  }, [selectedName, regions]);

  const detailRegion: AtlasRegion | null = useMemo(() => {
    if (selectedRegion) return selectedRegion;
    if (isKabKota && regions.length === 1) return regions[0];
    return null;
  }, [selectedRegion, isKabKota, regions]);

  // fetch rincian backend saat wilayah kab/kota terpilih berubah
  useEffect(() => {
    const name = detailRegion?.name ?? null;
    if (!name) { setRincian(null); setRincianError(null); return; }
    let cancelled = false;
    setRincianLoading(true);
    setRincianError(null);
    const base = apiBase();
    fetch(`${base}/api/wilayah-rincian?nama=${encodeURIComponent(name)}&tingkat=kabupaten_kota`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Rincian tidak tersedia (${res.status})`);
        const j = (await res.json()) as WilayahRincian;
        if (!cancelled) setRincian(j);
      })
      .catch((e: unknown) => {
        if (!cancelled) setRincianError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!cancelled) setRincianLoading(false); });
    return () => { cancelled = true; };
  }, [detailRegion?.name]);

  // ganti kab/kota: reset seleksi kecamatan saja, JANGAN paksa balik ke level "kab"
  // (yang bikin stuck: effect sebelumnya setLevel("kab") setiap detailRegion berubah, sehingga
  // klik yang barusan setLevel("kec") langsung dibalikin ke "kab" sebelum kecGeo ke-render)
  useEffect(() => {
    setKecSelected(null);
    setKecRincian(null);
    setKecRincianError(null);
  }, [detailRegion?.name]);

  // fetch rincian kecamatan terpilih (dari layer kecamatan)
  useEffect(() => {
    const kec = kecSelected;
    const kab = detailRegion?.name ?? null;
    if (!kec || !kab) { setKecRincian(null); setKecRincianError(null); return; }
    let cancelled = false;
    setKecRincianLoading(true);
    setKecRincianError(null);
    const base = apiBase();
    fetch(`${base}/api/wilayah-rincian?nama=${encodeURIComponent(kec)}&tingkat=kecamatan`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Rincian kec. tidak tersedia (${res.status})`);
        const j = (await res.json()) as WilayahRincian;
        if (!cancelled) setKecRincian(j);
      })
      .catch((e: unknown) => {
        if (!cancelled) setKecRincianError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => { if (!cancelled) setKecRincianLoading(false); });
    return () => { cancelled = true; };
  }, [kecSelected, detailRegion?.name]);

  const chartData = useMemo(() => {
    const sorted = [...regions].sort((a, b) => b.members - a.members);
    if (detailRegion) {
      if (isKabKota && regions.length === 1) return [detailRegion];
      const top5 = sorted.slice(0, 5);
      const inTop5 = top5.some((r) => r.name === detailRegion.name);
      if (inTop5) return sorted.slice(0, 6);
      return [...top5, detailRegion];
    }
    return sorted.slice(0, 6);
  }, [regions, detailRegion, isKabKota]);

  const chartMax = Math.max(1, ...chartData.map((r) => r.members));
  const membersMin = useMemo(() => Math.min(...regions.map((r) => r.members)), [regions]);
  const membersMax = useMemo(() => Math.max(...regions.map((r) => r.members)), [regions]);

  useEffect(() => {
    const q = regionQuery.trim().toLowerCase();
    if (q.length < 2) { setRegionResults([]); setRegionBoxOpen(false); return; }
    const hits = regions.filter((r) => `${r.name} ${r.type} ${r.dapil_ri} ${r.dapil_provinsi}`.toLowerCase().includes(q)).slice(0, 6);
    setRegionResults(hits);
    setRegionBoxOpen(hits.length > 0);
  }, [regionQuery, regions]);

  const filteredMemberList = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return visibleMembers;
    return visibleMembers.filter((m) => `${m.name} ${m.region}`.toLowerCase().includes(q));
  }, [memberQuery, visibleMembers]);

  useEffect(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) { setMemberBoxOpen(false); return; }
    const hits = visibleMembers.filter((m) => `${m.name} ${m.region}`.toLowerCase().includes(q));
    setMemberBoxOpen(hits.length > 0);
  }, [memberQuery, visibleMembers]);

  /* ── peta: kab/kota + drill-down kecamatan — basemap OSM, mask, gradasi, batas kecamatan ── */
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    async function init() {
      const L = await import("leaflet");
      if (cancelled) return;
      const el = document.getElementById("map");
      if (!el) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; geoRef.current = null; }
      const map = L.map(el as HTMLElement, {
        zoomControl: false,
        attributionControl: false,
        center: [-7.25, 110.1],
        zoom: 8,
        minZoom: 7,
        maxZoom: 14,
        maxBoundsViscosity: 1.0,
      });
      mapRef.current = map;
      L.control.zoom({ position: "topleft" }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: '<span style="display:inline-flex;align-items:center;gap:3px"><span style="width:12px;height:8px;background:#0478e3;display:inline-block;border-radius:1px"></span> Leaflet</span>' }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OSM · Dapil 1',
      }).addTo(map);

      try {
        async function fetchFirstOk(urls: string[]): Promise<Response> {
          let lastErr: Error | null = null;
          for (const u of urls) {
            try {
              const r = await fetch(u, { cache: "no-store" });
              if (r.ok) return r;
              lastErr = new Error(`${u} → ${r.status}`);
            } catch (e) { lastErr = e instanceof Error ? e : new Error(String(e)); }
          }
          throw lastErr ?? new Error("GeoJSON tidak ditemukan");
        }
        const KOTA_URLS = [MAP_URL, "/kabupaten-jawa-tengah.geojson", "/geojson/Jateng.geojson", "/geojson/kecamatan.geojson"];
        // level=kec -> pakai kecGeo yang sudah difilter per dapil/kab; level=kab -> kota.geojson
        let geojson: any;
        let jatengFeatures: any[];
        if (level === "kec" && kecGeo?.features?.length) {
          geojson = kecGeo;
          try {
            const pr = await fetchFirstOk(KOTA_URLS);
            const pj: any = await pr.json();
            jatengFeatures = pj.features ?? [];
          } catch { jatengFeatures = kecGeo.features ?? []; }
        } else if (level === "kec" && !kecGeo?.features?.length) {
          const res2 = await fetchFirstOk(KOTA_URLS);
          geojson = await res2.json();
          jatengFeatures = [...(geojson.features ?? [])];
        } else {
          const res = await fetchFirstOk(KOTA_URLS);
          geojson = await res.json();
          if (Array.isArray(geojson.features)) {
            const hasProv = geojson.features.some(
              (f: any) => f.properties?.PROVINSI !== undefined || f.properties?.PROPINSI !== undefined || f.properties?.KODE_PROV !== undefined
            );
            if (hasProv) {
              const filtered = geojson.features.filter((f: any) => {
                const p = f.properties;
                if (p.KODE_PROV !== undefined) return String(p.KODE_PROV) === "33";
                const prov = String(p.PROVINSI ?? p.PROPINSI ?? "").toLowerCase();
                return prov.includes("jawa tengah");
              });
              if (filtered.length) geojson.features = filtered;
            }
          }
          jatengFeatures = [...geojson.features];
          if (isScoped && regions.length) {
            const filtered = geojson.features.filter((f: any) => {
              const raw = String(f.properties?.KAB_KOTA ?? f.properties?.KABUPATEN ?? f.properties?.NAME_2 ?? f.properties?.name ?? "");
              return regions.some((r) => isSameKabKota(raw, r.name));
            });
            if (filtered.length) geojson.features = filtered;
          }
        }

        const getStyle = (feature: any, isSelected: boolean) => {
          if (level === "kec") {
            const kecName = String(feature.properties?.KECAMATAN ?? "").trim();
            const kab = String(feature.properties?.KAB_KOTA ?? "");
            const reg = atlasRegions.find((r) => isSameKabKota(kab, r.name));
            const base = reg ? reg.members : Math.round((membersMin + membersMax) / 2);
            const nKec = reg ? reg.kecamatan : 10;
            let h = 0;
            for (let i = 0; i < kecName.length; i++) h = (h * 31 + kecName.charCodeAt(i)) % 100;
            const v = Math.max(8, Math.round(base / nKec + (h % 11) - 5));
            // skala kecamatan: pakai min/max dari kecGeo saat drill-down
            let kMin = membersMin, kMax = membersMax;
            if (kecGeo?.features?.length) {
              const vals: number[] = kecGeo.features.map((ff: any) => {
                const kk = String(ff.properties?.KAB_KOTA ?? "");
                const rr = atlasRegions.find((x) => isSameKabKota(kk, x.name));
                const bb = rr ? rr.members : 150;
                const nn = rr ? rr.kecamatan : 10;
                const nm = String(ff.properties?.KECAMATAN ?? "");
                let hh = 0; for (let j = 0; j < nm.length; j++) hh = (hh * 31 + nm.charCodeAt(j)) % 100;
                return Math.max(8, Math.round(bb / nn + (hh % 11) - 5));
              });
              kMin = Math.min(...vals); kMax = Math.max(...vals);
            }
            const fill = isSelected ? "#1d4033" : fillForMembers(v, kMin, kMax);
            return { color: isSelected ? "#1d4033" : "#5a7f72", weight: isSelected ? 2.2 : 1, opacity: 1, fillColor: fill, fillOpacity: isSelected ? 0.58 : 0.42 } as import("leaflet").PathOptions;
          }
          const geoName = String(feature.properties?.KAB_KOTA ?? feature.properties?.KABUPATEN ?? feature.properties?.NAME_2 ?? feature.properties?.name ?? "");
          const region = findRegionByGeoName(geoName);
          const members = region?.members ?? Math.round((membersMin + membersMax) / 2);
          const fill = isSelected ? "#1d4033" : fillForMembers(members, membersMin, membersMax);
          return { color: isSelected ? "#1d4033" : "#4a7a64", weight: isSelected ? 2.4 : 1.1, opacity: 1, fillColor: fill, fillOpacity: isSelected ? 0.52 : 0.36 } as import("leaflet").PathOptions;
        };

        const layer = L.geoJSON(geojson as any, {
          style: (feature) => {
            if (level === "kec") {
              const kn = String(feature?.properties?.KECAMATAN ?? "").trim();
              const isSel = kecSelected ? kn.toLowerCase() === kecSelected.toLowerCase() : false;
              return getStyle(feature, isSel);
            }
            const geoName = String(feature?.properties?.KAB_KOTA ?? feature?.properties?.KABUPATEN ?? "");
            const isSel = detailRegion ? isSameKabKota(geoName, detailRegion.name) : false;
            return getStyle(feature, isSel);
          },
          onEachFeature: (feature: any, lyr: any) => {
            if (level === "kec") {
              const kecName: string = String(feature.properties?.KECAMATAN ?? "Kecamatan");
              const kabName: string = String(feature.properties?.KAB_KOTA ?? "");
              const kabPretty = kabName.replace(/^Semarang$/, "Kabupaten Semarang");
              const kodeKec: string = String(feature.properties?.KODE_KEC ?? feature.properties?.FID ?? "");
              lyr.bindTooltip(
                `<div style="font-weight:700;font-size:12px;color:#1d4033">${kecName}</div><div style="font-size:11px;color:#7c8983">${kabPretty}${kodeKec ? ` · ${kodeKec}` : ""}</div><div style="font-size:10px;color:#9db0a8">klik untuk detail kecamatan</div>`,
                { sticky: true, direction: "center", className: "adm-map-tooltip", opacity: 0.98 }
              );
              lyr.on({
                mouseover: (e: any) => {
                  const isSel = kecSelected ? kecName.toLowerCase() === kecSelected.toLowerCase() : false;
                  if (!isSel) e.target.setStyle({ weight: 1.7, fillOpacity: 0.54 } as any);
                  e.target.bringToFront();
                },
                mouseout: (e: any) => {
                  const isSel = kecSelected ? kecName.toLowerCase() === kecSelected.toLowerCase() : false;
                  e.target.setStyle(getStyle(feature, isSel) as any);
                },
                click: () => {
                  setKecSelected(kecName);
                },
              });
              return;
            }
            const rawKab: string = String(feature.properties?.KAB_KOTA ?? feature.properties?.KABUPATEN ?? feature.properties?.NAME_2 ?? "Wilayah");
            const label = rawKab.replace(/_/g, " ").replace(/\//g, " / ");
            const region = findRegionByGeoName(rawKab);
            const namaLengkap = region?.name ?? label;
            const dapilTxt = region ? `${region.dapil_ri} · ${region.dapil_provinsi}` : "Jawa Tengah";
            const membersTxt = region ? `${n.format(region.members)} anggota` : "";
            lyr.bindTooltip(
              `<div style="font-weight:700;font-size:12px;color:#1d4033">${namaLengkap}</div><div style="font-size:11px;color:#7c8983">${dapilTxt}${membersTxt ? ` · ${membersTxt}` : ""}</div><div style="font-size:10px;color:#9db0a8">klik untuk fokus & detail · Masuk kecamatan ↓</div>`,
              { sticky: true, direction: "center", className: "adm-map-tooltip", opacity: 0.98 }
            );
            lyr.on({
              mouseover: (e: any) => {
                const isSel = detailRegion ? isSameKabKota(rawKab, detailRegion.name) : false;
                if (!isSel) e.target.setStyle({ weight: 1.8, fillOpacity: 0.5 } as any);
                e.target.bringToFront();
              },
              mouseout: (e: any) => {
                const isSel = detailRegion ? isSameKabKota(rawKab, detailRegion.name) : false;
                e.target.setStyle(getStyle(feature, isSel) as any);
              },
              click: () => {
                const match = findRegionByGeoName(rawKab);
                const kabName = match ? match.name : rawKab;
                if (match) setSelectedName(match.name);
                else setSelectedName(rawKab);
                // auto drill-down: klik kab/kota langsung pecah ke kecamatan (bukan stuck di kab)
                void (async () => {
                  try {
                    setKecLoading(true);
                    setKecSelected(null);
                    setKecRincian(null);
                    setKecRincianError(null);
                    const base = apiBase();
                    const qs = `kab_kota=${encodeURIComponent(kabName)}`;
                    const res = await fetch(`${base}/api/geo/kecamatan?${qs}`, { cache: "no-store" });
                    if (!res.ok) throw new Error(`Gagal memuat kecamatan (${res.status})`);
                    const gj = await res.json();
                    setKecGeo(gj);
                    setLevel("kec");
                  } catch (e: unknown) {
                    setKecRincianError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setKecLoading(false);
                  }
                })();
                focusRegionByName(kabName);
              },
            });
          },
        }).addTo(map);

        const outerRing: [number, number][] = [
          [-180, 90],
          [180, 90],
          [180, -90],
          [-180, -90],
          [-180, 90],
        ];
        const provinceRings: [number, number][][] = [];
        for (const feature of jatengFeatures) {
          const geometry = feature.geometry;
          if (!geometry?.coordinates) continue;
          if (geometry.type === "Polygon") {
            const exterior = geometry.coordinates[0] as [number, number][];
            if (exterior) provinceRings.push(exterior);
          } else if (geometry.type === "MultiPolygon") {
            for (const polygon of geometry.coordinates) {
              const exterior = polygon[0] as [number, number][] | undefined;
              if (exterior) provinceRings.push(exterior);
            }
          }
        }
        const maskFeature: import("geojson").Feature<import("geojson").Polygon> = {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [outerRing, ...provinceRings] },
        };
        const mask = L.geoJSON(maskFeature, {
          style: {
            fillColor: "#f6f5ef",
            fillOpacity: 1,
            color: "transparent",
            weight: 0,
            interactive: false,
          } as import("leaflet").PathOptions,
          interactive: false,
        }).addTo(map);
        mask.bringToBack();
        layer.bringToFront();

        geoRef.current = layer as any;
        // batas & zoom: level kec -> zoom ke kumpulan kecamatan terpilih (pecah sesuai kab), bukan provinsi penuh
        let targetBounds: import("leaflet").LatLngBounds;
        if (level === "kec" && kecGeo?.features?.length) {
          targetBounds = L.geoJSON(kecGeo as any).getBounds();
        } else {
          const provinceGeoJson: import("geojson").FeatureCollection = {
            type: "FeatureCollection",
            features: jatengFeatures,
          };
          targetBounds = L.geoJSON(provinceGeoJson).getBounds();
        }
        // fallback bila bounds invalid (mis kec kosong)
        if (!targetBounds.isValid()) {
          const provinceGeoJson: import("geojson").FeatureCollection = {
            type: "FeatureCollection",
            features: jatengFeatures,
          };
          targetBounds = L.geoJSON(provinceGeoJson).getBounds();
        }
        const provinceGeoJson2: import("geojson").FeatureCollection = {
          type: "FeatureCollection",
          features: jatengFeatures,
        };
        const provinceBounds = L.geoJSON(provinceGeoJson2).getBounds();
        map.fitBounds(targetBounds, { padding: level === "kec" ? [28, 28] : [48, 48], maxZoom: level === "kec" ? 12 : 9 });
        map.setMinZoom(map.getZoom() - 1);
        map.setMaxBounds(provinceBounds.pad(0.25));
        setTimeout(() => map.invalidateSize(), 180);
        map.on("moveend", () => {
          const b = provinceBounds.pad(0.25);
          if (!b.contains(map.getCenter())) map.panInsideBounds(b, { animate: true });
        });
        setMapReady(true);
        const mapErr = document.getElementById("map-error");
        if (mapErr) mapErr.hidden = true;
        if (level === "kec" && kecGeo?.features?.length) {
          // sudah di-zoom ke kec, tidak perlu focus kab lagi
        } else if (isKabKota && regions.length === 1) setTimeout(() => focusRegionByName(regions[0].name), 400);
        else if (detailRegion) setTimeout(() => focusRegionByName(detailRegion.name), 400);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        const isFetchFail = /failed to fetch|networkerror|load failed/i.test(msg);
        const el = document.getElementById("map-error");
        if (el) {
          el.hidden = false;
          el.textContent = isFetchFail
            ? "Geometri peta belum dapat dimuat. Periksa koneksi internet untuk memuat GeoJSON."
            : `Gagal memuat geometri: ${msg}`;
        }
      }
    }
    void init();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; geoRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, isScoped, regions.length, scopeKey, detailRegion?.name, membersMin, membersMax, level, kecGeo, kecSelected]);

  // re-style saat detailRegion/kecSelected berubah (selected highlight) + gradasi kecamatan
  useEffect(() => {
    if (!geoRef.current) return;
    if (level === "kec" && kecGeo) {
      const features: any[] = kecGeo.features ?? [];
      const kecCounts = new Map<string, number>();
      for (const f of features) {
        const nm = String(f.properties?.KECAMATAN ?? "").trim();
        if (!nm) continue;
        // estimasi anggota per kecamatan dari atlas: members_kab / jumlah_kec, diacak ringan agar gradasi terlihat
        const kab = String(f.properties?.KAB_KOTA ?? "");
        const reg = atlasRegions.find((r) => isSameKabKota(kab, r.name));
        const base = reg ? reg.members : Math.round((membersMin + membersMax) / 2);
        const nKec = reg ? reg.kecamatan : 10;
        // hash sederhana untuk variasi gradiasi antar kec dalam kab yang sama
        let h = 0;
        for (let i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) % 100;
        const v = Math.max(8, Math.round(base / nKec + (h % 11) - 5));
        kecCounts.set(nm, v);
      }
      const vals = [...kecCounts.values()];
      const kMin = vals.length ? Math.min(...vals) : membersMin;
      const kMax = vals.length ? Math.max(...vals) : membersMax;
      (geoRef.current as any).eachLayer((l: any) => {
        const kecName = String(l.feature?.properties?.KECAMATAN ?? "").trim();
        const isSel = kecSelected ? kecName.toLowerCase() === kecSelected.toLowerCase() : false;
        const v = kecCounts.get(kecName) ?? Math.round((kMin + kMax) / 2);
        const fill = isSel ? "#1d4033" : fillForMembers(v, kMin, kMax);
        l.setStyle({
          color: isSel ? "#1d4033" : "#4a7a64",
          weight: isSel ? 2.2 : 1,
          opacity: 1,
          fillColor: fill,
          fillOpacity: isSel ? 0.58 : 0.42,
        } as any);
      });
      return;
    }
    (geoRef.current as any).eachLayer((l: any) => {
      const raw = String(l.feature?.properties?.KAB_KOTA ?? l.feature?.properties?.KABUPATEN ?? "");
      const isSel = detailRegion ? isSameKabKota(raw, detailRegion.name) : false;
      const region = findRegionByGeoName(raw);
      const members = region?.members ?? Math.round((membersMin + membersMax) / 2);
      l.setStyle({
        color: isSel ? "#1d4033" : "#4a7a64",
        weight: isSel ? 2.4 : 1.1,
        fillColor: isSel ? "#1d4033" : fillForMembers(members, membersMin, membersMax),
        fillOpacity: isSel ? 0.52 : 0.36,
      } as any);
    });
  }, [detailRegion, membersMin, membersMax, level, kecGeo, kecSelected]);

  function focusRegionByName(name: string) {
    const layer: any = geoRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    // level kecamatan: fokus ke kecamatan, bukan kab
    if (level === "kec" && kecSelected) {
      let foundKec: any = null;
      layer.eachLayer((l: any) => {
        const kn = String(l.feature?.properties?.KECAMATAN ?? "").trim();
        if (kn.toLowerCase() === kecSelected.toLowerCase()) foundKec = l;
      });
      if (foundKec) { foundKec.bringToFront(); map.fitBounds(foundKec.getBounds(), { padding: [44, 44], maxZoom: 12 }); foundKec.openTooltip(); return; }
    }
    let exactLayer: any = null;
    const candidates: any[] = [];
    layer.eachLayer((l: any) => {
      const raw = String(l.feature?.properties?.KAB_KOTA ?? l.feature?.properties?.KABUPATEN ?? l.feature?.properties?.NAME_2 ?? "");
      if (isSameKabKota(raw, name)) {
        exactLayer = l;
      } else {
        const gt = parseKab(raw);
        const at = parseKab(name);
        if (!at.type && gt.base === at.base) candidates.push(l);
      }
    });
    if (exactLayer) {
      exactLayer.bringToFront();
      map.fitBounds(exactLayer.getBounds(), { padding: [44, 44], maxZoom: 11 });
      exactLayer.openTooltip();
      return;
    }
    if (candidates.length) {
      const l = candidates[0];
      l.bringToFront();
      map.fitBounds(l.getBounds(), { padding: [44, 44], maxZoom: 11 });
      l.openTooltip();
      return;
    }
    const b = layer.getBounds();
    map.fitBounds(b, { padding: [18, 18], maxZoom: 9 });
  }

  async function handleMasukKecamatan() {
    const kabName = detailRegion?.name;
    if (!kabName) return;
    setLevel("kec");
    setKecLoading(true);
    setKecSelected(null);
    setKecRincian(null);
    setKecRincianError(null);
    try {
      const base = apiBase();
      const qs = `kab_kota=${encodeURIComponent(kabName)}`;
      const url = `${base}/api/geo/kecamatan?${qs}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Gagal memuat kecamatan (${res.status})`);
      const gj = await res.json();
      setKecGeo(gj);
    } catch (e: unknown) {
      setKecRincianError(e instanceof Error ? e.message : String(e));
    } finally {
      setKecLoading(false);
    }
  }
  function handleKembaliKab() {
    setLevel("kab");
    setKecSelected(null);
    setKecRincian(null);
    setKecRincianError(null);
    setKecGeo(null);
  }

  function handleSelectRegion(r: AtlasRegion) {
    setSelectedName(r.name);
    setRegionQuery(r.name);
    setRegionBoxOpen(false);
    focusRegionByName(r.name);
  }

  function handleReset() {
    setRegionQuery("");
    setMemberQuery("");
    setRegionBoxOpen(false);
    setMemberBoxOpen(false);
    if (isScoped && selectedDapilLabel) {
      const first = regions[0];
      if (first) { setSelectedName(first.name); focusRegionByName(first.name); }
    } else {
      setSelectedName(null);
      const layer: any = geoRef.current;
      if (layer) mapRef.current?.fitBounds(layer.getBounds(), { padding: [18, 18], maxZoom: 9 });
      else mapRef.current?.setView([-7.25, 110.1], 8);
    }
  }

  const kecValue = useMemo(() => {
    if (detailRegion) return n.format(detailRegion.kecamatan);
    return n.format(totals.subdistricts);
  }, [detailRegion, totals.subdistricts]);
  const kecCaption = useMemo(() => {
    if (detailRegion) return `${detailRegion.type} · ${n.format(detailRegion.desa)} desa/kel`;
    if (isScoped && selectedDapilLabel) return `${selectedDapilLabel} · ${totals.districts} kab/kota`;
    return `seluruh Jateng · ${totals.districts} kab/kota`;
  }, [detailRegion, isScoped, selectedDapilLabel, totals.districts, totals.villages]);

  const displayMembers = filteredMemberList;
  const isKabKotaScoped = isKabKota && isScoped;
  let statDapilRi = "10", statDapilProv = "13", statJumlahDapil = "—";
  let statDapilRiCaption = "daerah pemilihan", statDapilProvCaption = "daerah pemilihan", statJumlahDapilCaption = "pilih kabupaten/kota";
  if (isScoped) {
    if (isKabKotaScoped) {
      statDapilRi = "—"; statDapilProv = "—"; statJumlahDapil = "2";
      statJumlahDapilCaption = "1 Dapil RI · 1 Dapil Provinsi";
      statDapilRiCaption = "kosongan untuk mode kab/kota";
      statDapilProvCaption = "kosongan untuk mode kab/kota";
    } else if (scope?.dapil_type === "ri" && scope.dapil_number) {
      statDapilRi = String(scope.dapil_number); statDapilProv = "—";
      statJumlahDapil = "—"; statJumlahDapilCaption = "khusus kabupaten/kota";
    } else if (scope?.dapil_type === "provinsi" && scope.dapil_number) {
      statDapilProv = String(scope.dapil_number); statDapilRi = "—";
      statJumlahDapil = "—"; statJumlahDapilCaption = "khusus kabupaten/kota";
    }
  }

  /* ── lock screen saat cek auth — mirip pengurus (auth-page) ── */
  if (!authChecked) {
    return (
      <div className="auth-page" style={{ minHeight: "100dvh" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div className="auth-lock-badge"><i>🔒</i><span>MEMERIKSA AKSES</span></div>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Memverifikasi sesi — silakan tunggu...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <div className="page-shell">
        <header className="topbar">
          <Link className="brand" href="/" aria-label="Atlas Jateng">
            <span className="brand-mark"><i /><i /><i /></span>
            <span><strong>SISTEM INFORMASI GEOGRAFIS</strong><small>JAWA TENGAH</small></span>
          </Link>
          <nav className="dashboard-nav" aria-label="Navigasi dashboard">
            <a className="active" href="#overview">Ringkasan</a>
            <a href="#map-section">Peta wilayah</a>
            <a href="#members-section">Direktori anggota</a>
            {me && (me.role === "admin" || me.role === "super_admin") && <Link href="/admin">Admin studio</Link>}
          </nav>
          <div className="topbar-meta">
            <span className="status-dot" /><span>DATA TERBARU</span><b>24 SEP 2026</b>
            <button
              onClick={() => { clearToken(); localStorage.removeItem("atlas_scope"); setMe(null); setAuthChecked(false); router.replace("/login"); }}
              title="Keluar"
            >
              Keluar
            </button>
          </div>
        </header>

        <main>
          <section className="intro" id="overview">
            <div>
              <p className="eyebrow">PUSAT DATA GEOGRAFIS</p>
              <h1>Mengenal Jawa Tengah<br /><em>lebih dekat.</em></h1>
              <p className="intro-copy">
                {isScoped ? (<>Dashboard terkunci ke <b>{selectedDapilLabel}</b> — Anda hanya dapat melihat data wilayah pilihan saat register.</>) : "Eksplorasi data wilayah, persebaran anggota, dan struktur administrasi Jawa Tengah dalam satu pandangan yang tenang dan natural."}
              </p>
              {selectedDapilLabel && <span className="scope-badge">{selectedDapilLabel} · tampilan terkunci</span>}
            </div>
            <div className="coordinate-note"><span>KOORDINAT PUSAT</span><strong>7°15′S 110°24′E</strong><small>JAWA TENGAH, INDONESIA</small></div>
          </section>

          {isScoped && <div className="scope-notice" role="status">🔒 Tampilan terkunci: <b>{selectedDapilLabel}</b> — pencarian, peta, dan direktori hanya menampilkan wilayah ini.</div>}

          {isScoped && isKabKota && dapilInfo && (
            <section className="dapil-ribbon" aria-label="Informasi dapil wilayah terpilih">
              <div className="dapil-ribbon-head">
                <p className="eyebrow" style={{ margin: "0 0 8px" }}>INFORMASI DAPIL WILAYAH</p>
                <h3>{(dapilInfo as any).kabupaten_kota}</h3>
                <p>Wilayah ini terasosiasi dengan <b>1 Dapil RI</b> dan <b>1 Dapil Provinsi</b> — jumlah dapil tidak dapat dipilih ulang setelah register.</p>
              </div>
              <div className="dapil-chips">
                <article className="dapil-chip"><span>DAPIL RI</span><strong>{(dapilInfo as any).dapil_ri ?? "—"}</strong><small>DPR RI · Jawa Tengah</small><i className="dapil-chip-accent" /></article>
                <div className="dapil-chip-divider" aria-hidden><span>×</span></div>
                <article className="dapil-chip"><span>DAPIL PROVINSI</span><strong>{(dapilInfo as any).dapil_provinsi ?? "—"}</strong><small>DPRD Provinsi · Jawa Tengah</small><i className="dapil-chip-accent prov" /></article>
              </div>
              <div className="dapil-ribbon-foot">
                <span><i className="legend-low" style={{ width: 6, height: 6, display: "inline-block", borderRadius: "50%" }} /> Jumlah dapil terasosiasi</span>
                <b>1 Dapil RI &nbsp;·&nbsp; 1 Dapil Provinsi</b>
                <small>{(dapilInfo as any).kecamatan ?? "-"} kecamatan · {(dapilInfo as any).desa ?? "-"} desa/kelurahan · {(dapilInfo as any).members ?? "-"} anggota</small>
              </div>
            </section>
          )}
          {isScoped && !isKabKota && dapilInfo && (dapilInfo as any).scope_type && (
            <section className="dapil-ribbon dapil-ribbon-compact" aria-label="Ringkasan dapil terpilih">
              <div className="dapil-ribbon-head">
                <p className="eyebrow" style={{ margin: "0 0 8px" }}>INFORMASI DAPIL TERPILIH</p>
                <h3>{(dapilInfo as any).scope_label}</h3>
                <p>Mencakup <b>{(dapilInfo as any).districts} kabupaten/kota</b> di Jawa Tengah — data dashboard difilter ke dapil ini saja.</p>
              </div>
              <div className="dapil-ribbon-foot"><span>Jumlah wilayah dalam dapil</span><b>{(dapilInfo as any).districts} kabupaten/kota</b></div>
            </section>
          )}

          <section className="search-row" aria-label="Pencarian data">
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <label htmlFor="region-search">Cari wilayah {isScoped ? selectedDapilLabel : "Jawa Tengah"}</label>
              <input
                id="region-search"
                type="search"
                placeholder={isScoped && isKabKota ? `Desa/kecamatan di ${selectedDapilLabel}...` : "Desa, kecamatan, kabupaten atau kota..."}
                autoComplete="off"
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                onFocus={() => { if (regionResults.length) setRegionBoxOpen(true); }}
              />
              {regionBoxOpen && (
                <div className="search-results">
                  {regionResults.map((r) => (
                    <button key={r.name} type="button" className="result-item" onClick={() => handleSelectRegion(r)}>
                      <span>{r.name}<small>{r.type} · {r.dapil_ri} · {r.dapil_provinsi}</small></span><b>Fokus ↗</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="search-box">
              <span className="search-icon">⌕</span>
              <label htmlFor="member-search">Cari anggota</label>
              <input id="member-search" type="search" placeholder="Nama anggota..." autoComplete="off" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} onFocus={() => { if (memberQuery.trim().length >= 2) setMemberBoxOpen(true); }} />
              {memberBoxOpen && (
                <div className="search-results">
                  {visibleMembers.filter((m) => `${m.name} ${m.region}`.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 6).map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      className="result-item"
                      onClick={() => { setMemberQuery(m.name); setMemberBoxOpen(false); const r = atlasRegions.find((x) => x.name === m.region); if (r) { setSelectedName(r.name); focusRegionByName(r.name); } }}
                    >
                      <span>{m.name}<small>{m.role} · {m.region}</small></span><b>Detail ↗</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="filter-button" type="button" onClick={handleReset}>{isScoped ? `Kembali ke ${selectedDapilLabel}` : "Reset tampilan"} <span>↗</span></button>
          </section>

          <section className="stat-grid" aria-label="Ringkasan Jawa Tengah">
            <article className="stat-card stat-main">
              <span className="stat-label">ANGGOTA TERDATA</span><strong>{n.format(totals.members)}</strong>
              <span className="stat-trend">{isScoped ? `khusus ${selectedDapilLabel}` : <><span>+8.4% <small>sejak pembaruan terakhir</small></span></>}</span>
              <div className="sparkline"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
            </article>
            <article className={`stat-card ${isKabKotaScoped ? "stat-empty" : ""}`}><span className="stat-label">DAPIL RI</span><strong>{statDapilRi}</strong><span className="stat-caption">{statDapilRiCaption}</span><span className="stat-index">01</span></article>
            <article className={`stat-card ${isKabKotaScoped ? "stat-empty" : ""}`}><span className="stat-label">DAPIL PROVINSI</span><strong>{statDapilProv}</strong><span className="stat-caption">{statDapilProvCaption}</span><span className="stat-index">02</span></article>
            <article className="stat-card"><span className="stat-label">KABUPATEN / KOTA</span><strong>{totals.districts}</strong><span className="stat-caption">{isKabKotaScoped ? "1 wilayah terkunci" : "wilayah administratif"}</span><span className="stat-index">03</span></article>
            <article className={`stat-card stat-dapil-count ${!isKabKotaScoped ? "stat-empty" : ""}`}><span className="stat-label">JUMLAH DAPIL</span><strong>{statJumlahDapil}</strong><span className="stat-caption">{statJumlahDapilCaption}</span><span className="stat-index">04</span></article>
            <article className="stat-card stat-kec"><span className="stat-label">KECAMATAN</span><strong>{kecValue}</strong><span className="stat-caption">{kecCaption}</span><span className="stat-index">05</span></article>
          </section>

          <section className="map-section" id="map-section">
            <div className="section-heading">
              <div><p className="eyebrow">01 / PETA WILAYAH</p><h2>Jawa Tengah <span id="map-heading-suffix">{detailRegion ? `di ${detailRegion.name}.` : isScoped ? `di ${selectedDapilLabel}.` : "secara keseluruhan."}</span></h2></div>
              <div className="map-legend map-legend-grad" aria-label="Legenda gradiasi anggota">
                <div className="map-legend-bar" title="Gradiasi: terang=rendah, gelap=tinggi" aria-hidden />
                {level === "kec" ? (
                  <>
                    <span><i className="legend-low" /> rendah (kec)</span>
                    <span><i className="legend-high" /> tinggi (kec)</span>
                    <small>skala {detailRegion?.name ?? "kecamatan"}</small>
                  </>
                ) : (
                  <>
                    <span><i className="legend-low" /> {n.format(membersMin)} rendah</span>
                    <span><i className="legend-high" /> {n.format(membersMax)} tinggi</span>
                    <small>{isScoped ? `skala ${selectedDapilLabel ?? ""}` : "skala global Jateng"}</small>
                  </>
                )}
              </div>
            </div>
            <div className="map-frame">
              <div id="map" aria-label="Peta geometri Jawa Tengah" />
              <div className="map-overlay"><span className="map-live-dot" /><span>GEOJSON LIVE LAYER · BATAS TETAP TERLIHAT</span></div>
              {!mapReady && <div className="map-error" style={{ display: "grid", placeItems: "center" }}>Memuat peta Jawa Tengah...</div>}
              <div id="map-error" className="map-error" hidden>Geometri peta belum dapat dimuat. Periksa koneksi internet untuk memuat GeoJSON.</div>
            </div>
            <p style={{ color: "var(--muted)", font: "500 11px 'DM Mono',monospace", marginTop: 10 }}>Klik wilayah pada peta untuk melihat detail · warna menunjukkan kepadatan anggota (hijau tua = terbanyak).</p>
          </section>

          <section className="content-grid">
            <article className="detail-panel">
              <div className="section-heading compact">
                <div><p className="eyebrow">02 / DETAIL WILAYAH</p><h2 id="detail-name">{detailRegion ? detailRegion.name : "Jawa Tengah"}</h2></div>
                <span id="detail-type" className="type-tag">{detailRegion ? detailRegion.type.toUpperCase() : "PROVINSI"}</span>
              </div>
              <p id="detail-description" className="detail-description">
                {detailRegion
                  ? isKabKota && dapilInfo ? `${detailRegion.name} berada di ${detailRegion.dapil_ri} dan ${detailRegion.dapil_provinsi} — ${n.format(detailRegion.kecamatan)} kecamatan, ${n.format(detailRegion.desa)} desa/kelurahan, ${n.format(detailRegion.members)} anggota terdata.`
                    : `${detailRegion.name} memiliki ${detailRegion.kecamatan} kecamatan dan ${detailRegion.desa} desa atau kelurahan. Terdapat ${n.format(detailRegion.members)} anggota terdata di wilayah ini.`
                  : "Pilih satu wilayah pada peta atau gunakan pencarian untuk melihat ringkasan wilayah secara lebih spesifik."}
              </p>
              {isKabKota && dapilInfo && detailRegion && (
                <div className="detail-dapil-row" aria-label="Dapil terasosiasi">
                  <span className="detail-dapil-badge ri">{(dapilInfo as any).dapil_ri}</span><span className="detail-dapil-sep">·</span><span className="detail-dapil-badge prov">{(dapilInfo as any).dapil_provinsi}</span><small>asosiasi dapil wilayah ini</small>
                </div>
              )}
              <div className="detail-metrics">
                <div><span>KABUPATEN / KOTA</span><strong id="detail-districts">{detailRegion ? "1" : String(totals.districts)}</strong></div>
                <div><span>KECAMATAN</span><strong id="detail-subdistricts">{n.format(detailRegion ? detailRegion.kecamatan : totals.subdistricts)}</strong></div>
                <div><span>DESA / KELURAHAN</span><strong id="detail-villages">{n.format(detailRegion ? detailRegion.desa : totals.villages)}</strong></div>
              </div>
              <div className="detail-footer" style={{ flexWrap: "wrap" }}>
                <span className="pin-icon">⌖</span>
                <span id="detail-dapil">{detailRegion ? `${detailRegion.dapil_ri} · ${detailRegion.dapil_provinsi} · ${n.format(detailRegion.members)} anggota` : selectedDapilLabel ? selectedDapilLabel : "10 dapil RI · 13 dapil Provinsi"}</span>
                <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                  {level === "kab" && detailRegion && (
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={handleMasukKecamatan} disabled={kecLoading}>
                      {kecLoading ? "Memuat..." : "Masuk kecamatan ↓"}
                    </button>
                  )}
                  {level === "kec" && (
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={handleKembaliKab}>← Kembali kab/kota</button>
                  )}
                  <button id="zoom-region" type="button" onClick={() => { if (level === "kec" && kecSelected) { /* fokus kec sudah di useEffect */ } else if (detailRegion) focusRegionByName(detailRegion.name); else if (selectedDapilLabel) focusRegionByName(regions[0]?.name ?? ""); else { const l:any=geoRef.current; if(l) mapRef.current?.fitBounds(l.getBounds(), { padding:[18,18], maxZoom:9}); } }}>Fokus peta ↗</button>
                </div>
              </div>
              {level === "kec" && detailRegion && (
                <div style={{ marginTop: 12, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(246,245,239,.7)", fontSize: 12 }}>
                  <b style={{ color: "var(--green-dark)" }}>Mode kecamatan — {detailRegion.name}</b>
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>{kecGeo ? `${kecGeo.features?.length ?? 0} kecamatan` : kecLoading ? "memuat batas..." : ""}{kecSelected ? ` · terpilih: ${kecSelected}` : ""}</span>
                  {kecRincianError && <div className="form-error" style={{ marginTop: 8 }}>{kecRincianError}</div>}
                </div>
              )}
            </article>

            <article className="chart-panel">
              <div className="section-heading compact">
                <div><p className="eyebrow">03 / PERSEBARAN ANGGOTA</p><h2 id="chart-heading">{isKabKota && regions.length === 1 ? "Sebaran anggota wilayah terpilih" : detailRegion ? "Sebaran Wilayah Terpilih" : "Wilayah dengan anggota terbanyak"}</h2></div>
                <div className="chart-badges">
                  <span id="chart-badge" className={`type-tag ${detailRegion ? "accent-badge" : ""}`}>{isKabKota && regions.length === 1 ? "TERKUNCI" : detailRegion ? `PERINGKAT #${[...regions].sort((a,b)=>b.members-a.members).findIndex(r=>r.name===detailRegion.name)+1}` : "TOP 6 WILAYAH"}</span>
                  <span className="chart-period">2026</span>
                </div>
              </div>
              <p id="chart-description" className="detail-description">
                {detailRegion
                  ? isKabKota && regions.length === 1 ? `${detailRegion.name} — ${(dapilInfo as any)?.dapil_ri ?? detailRegion.dapil_ri} & ${(dapilInfo as any)?.dapil_provinsi ?? detailRegion.dapil_provinsi} · ${n.format(detailRegion.members)} anggota.`
                    : `${detailRegion.name} memiliki ${n.format(detailRegion.members)} anggota (posisi ke-${[...regions].sort((a,b)=>b.members-a.members).findIndex(r=>r.name===detailRegion.name)+1} dari ${regions.length} kabupaten/kota).`
                  : "Peringkat 6 wilayah dengan sebaran pengurus dan anggota terbanyak di Jawa Tengah."}
              </p>
              <div style={{ display: "grid", gap: 10, margin: "8px 0 12px" }}>
                {chartData.map((r) => {
                  const isHi = detailRegion?.name === r.name;
                  const pct = Math.max(8, (r.members / chartMax) * 100);
                  return (
                    <div key={r.name} style={{ display: "grid", gridTemplateColumns: "140px 1fr 62px", alignItems: "center", gap: 10, fontSize: 12 }}>
                      <span style={{ font: "600 11px 'DM Mono',monospace", color: isHi ? "var(--clay)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortName(r.name)}{isHi ? " 📍" : ""}</span>
                      <span style={{ height: 10, background: "#e8eee8", borderRadius: 5, overflow: "hidden", display: "block" }}>
                        <i style={{ display: "block", height: "100%", width: `${pct}%`, background: isHi ? "var(--clay)" : "var(--green)", borderRadius: 5 }} />
                      </span>
                      <b style={{ textAlign: "right", font: "600 11px 'DM Mono',monospace", color: "var(--ink)" }}>{n.format(r.members)}</b>
                    </div>
                  );
                })}
              </div>
              <div className="detail-footer chart-footer">
                <div className="chart-summary-stat"><span className="pin-icon">📊</span><span id="chart-summary-text">{detailRegion ? `${shortName(detailRegion.name)} · ${n.format(detailRegion.members)} anggota` : chartData[0] ? `Tertinggi: ${shortName(chartData[0].name)} (${n.format(chartData[0].members)} anggota)` : "—"}</span></div>
                <button type="button" onClick={() => { setSelectedName(null); const l:any=geoRef.current; if(l) mapRef.current?.fitBounds(l.getBounds(), { padding:[18,18], maxZoom:9}); }}>Lihat Top 6 ↗</button>
              </div>
            </article>
          </section>

          {/* 05 — Rincian kab/kota; 06 — Rincian kecamatan (drill-down) */}
          <section className="rincian-section" id="rincian-wilayah" aria-label="Rincian wilayah terpilih">
            <div className="section-heading compact">
              <div><p className="eyebrow">05 / RINCIAN WILAYAH</p><h2>{detailRegion ? `Rincian ${detailRegion.name}` : selectedDapilLabel ? `Rincian ${selectedDapilLabel}` : "Rincian wilayah"}</h2></div>
              {rincian && <span className="type-tag">{n.format(rincian.total_partai)} partai · {n.format(rincian.jumlah_partai_ada)} ada</span>}
            </div>
            {!detailRegion ? (
              <p className="detail-description">Klik kabupaten/kota di peta untuk melihat rincian: partai ada/tidak, jumlah pendukung / penggerak / pelopor (enum <b>ada / tidak</b>), jumlah partai, kepala desa, komunitas senam, dan tokoh partai. Lalu <b>Masuk kecamatan</b> untuk pecah sampai batas kecamatan.</p>
            ) : rincianLoading ? (
              <p className="detail-description">Memuat rincian {detailRegion.name}...</p>
            ) : rincianError ? (
              <div className="form-error" role="alert">Gagal memuat rincian: {rincianError}</div>
            ) : rincian ? (
              <div className="rincian-grid">
                <article className="rincian-card">
                  <h3>Partai di wilayah ini</h3>
                  <p className="rincian-meta">{rincian.jumlah_partai_ada} dari {rincian.total_partai} partai tercatat <b>ada</b> di wilayah ini</p>
                  <ul className="rincian-list">
                    {rincian.partai.map((p) => (
                      <li key={p.partai_id} className={p.ada ? "is-ada" : "is-tidak"}>
                        <span className="rincian-pill" data-ada={p.enum_ada}>{p.enum_ada}</span>
                        <strong>{p.partai_nama}</strong>
                        <small>{p.ada ? `${n.format(p.jumlah_pendukung)} pendukung · ${n.format(p.jumlah_penggerak)} penggerak · ${n.format(p.jumlah_pelopor)} pelopor` : "tidak ada data anggota"}</small>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rincian-card">
                  <h3>Peran — pendukung / penggerak / pelopor</h3>
                  <p className="rincian-meta">Enum pakai <b>ada / tidak</b> (ada = jumlah &gt; 0)</p>
                  <div className="rincian-peran-grid">
                    <div><span>PENDUKUNG</span><strong>{n.format(rincian.peran.total_pendukung)}</strong><i className={rincian.peran.ada_pendukung ? "is-ada" : "is-tidak"}>{rincian.peran.enum_pendukung}</i></div>
                    <div><span>PENGGERAK</span><strong>{n.format(rincian.peran.total_penggerak)}</strong><i className={rincian.peran.ada_penggerak ? "is-ada" : "is-tidak"}>{rincian.peran.enum_penggerak}</i></div>
                    <div><span>PELOPOR</span><strong>{n.format(rincian.peran.total_pelopor)}</strong><i className={rincian.peran.ada_pelopor ? "is-ada" : "is-tidak"}>{rincian.peran.enum_pelopor}</i></div>
                  </div>
                  <ul className="rincian-list compact">
                    {rincian.partai.map((p) => (
                      <li key={`peran-${p.partai_id}`}>
                        <strong>{p.partai_nama}</strong>
                        <small>pendukung <b className={p.ada_pendukung ? "is-ada" : "is-tidak"}>{p.enum_ada === "ada" && p.ada_pendukung ? "ada" : "tidak"}</b> · penggerak <b className={p.ada_penggerak ? "is-ada" : "is-tidak"}>{p.ada_penggerak ? "ada" : "tidak"}</b> · pelopor <b className={p.ada_pelopor ? "is-ada" : "is-tidak"}>{p.ada_pelopor ? "ada" : "tidak"}</b></small>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="rincian-card">
                  <h3>Kepala desa &amp; jumlah partai</h3>
                  <div className="rincian-row">
                    <span>KEPALA DESA</span><strong>{rincian.kepala_desa.jumlah} desa</strong><i className={rincian.kepala_desa.ada ? "is-ada" : "is-tidak"}>{rincian.kepala_desa.enum_ada}</i>
                  </div>
                  <div className="rincian-row">
                    <span>JUMLAH PARTAI</span><strong>{rincian.jumlah_partai_ada} / {rincian.total_partai}</strong><small>partai dengan anggota di wilayah</small>
                  </div>
                  {rincian.kepala_desa.detail.length > 0 && (
                    <ul className="rincian-list compact">
                      {rincian.kepala_desa.detail.slice(0, 6).map((d) => (
                        <li key={d.id}><strong>Kades #{d.id}</strong><small>{d.ada ? "ada" : "tidak"} {d.partai_nama ? `· ${d.partai_nama}` : ""}</small></li>
                      ))}
                    </ul>
                  )}
                </article>
                <article className="rincian-card">
                  <h3>Komunitas senam</h3>
                  <div className="rincian-row">
                    <span>KOMUNITAS SENAM</span><strong>{n.format(rincian.komunitas_senam.total_komunitas)} komunitas</strong><i className={rincian.komunitas_senam.ada ? "is-ada" : "is-tidak"}>{rincian.komunitas_senam.enum_ada}</i>
                  </div>
                  {rincian.komunitas_senam.detail.length > 0 ? (
                    <ul className="rincian-list compact">
                      {rincian.komunitas_senam.detail.map((d) => (
                        <li key={d.id}><strong>{n.format(d.jumlah_komunitas)} komunitas</strong><small>{d.partai_nama ?? "—"}{d.keterangan ? ` · ${d.keterangan}` : ""}</small></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rincian-empty">Belum ada komunitas senam terdata di wilayah ini.</p>
                  )}
                </article>
                <article className="rincian-card rincian-span-2">
                  <h3>Tokoh partai</h3>
                  <div className="rincian-row">
                    <span>TOTAL TOKOH</span><strong>{n.format(rincian.tokoh_partai.total_tokoh)} tokoh</strong><i className={rincian.tokoh_partai.ada ? "is-ada" : "is-tidak"}>{rincian.tokoh_partai.enum_ada}</i>
                  </div>
                  {rincian.tokoh_partai.daftar.length > 0 ? (
                    <ul className="rincian-list">
                      {rincian.tokoh_partai.daftar.map((t) => (
                        <li key={t.id}><span className="rincian-pill subtle">{t.jenis_tokoh}</span><strong>{n.format(t.jumlah_tokoh)} tokoh</strong><small>{t.partai_nama ?? "—"}{t.keterangan ? ` · ${t.keterangan}` : ""}</small></li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rincian-empty">Belum ada tokoh partai terdata di wilayah ini.</p>
                  )}
                </article>
              </div>
            ) : null}
          </section>

          {level === "kec" && detailRegion && (
            <section className="rincian-section" id="rincian-kecamatan" aria-label="Rincian kecamatan">
              <div className="section-heading compact">
                <div><p className="eyebrow">06 / RINCIAN KECAMATAN</p><h2>{kecSelected ? `Kec. ${kecSelected} — ${detailRegion.name}` : `Kecamatan di ${detailRegion.name}`}</h2></div>
                <span className="type-tag">{kecGeo ? `${kecGeo.features?.length ?? 0} kecamatan` : "—"} · batas sesuai dapil/kab dipilih</span>
              </div>
              {!kecGeo ? (
                <p className="detail-description">{kecLoading ? "Memuat batas kecamatan..." : "Memuat..."}</p>
              ) : !kecSelected ? (
                <div>
                  <p className="detail-description">Klik salah satu kecamatan di peta (gradiasi gelap=padat). Data agregat kecamatan mengikuti wilayah dapil/kab-kota yang sedang aktif. Batas kecamatan diambil dari <code style={{ fontSize: 11 }}>kecamatan.geojson</code> (KODE_KEC · KODE_KK · KAB_KOTA).</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 8, marginTop: 10 }}>
                    {kecGeo.features.slice(0, 32).map((f: any) => {
                      const nm = String(f.properties?.KECAMATAN ?? "");
                      const kode = String(f.properties?.KODE_KEC ?? "");
                      return <button key={kode || nm} type="button" onClick={() => setKecSelected(nm)} style={{ textAlign: "left", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 10, background: "#fff", fontSize: 12 }}><b>{nm}</b><small style={{ display: "block", color: "var(--muted)" }}>{kode}</small></button>;
                    })}
                  </div>
                  {kecGeo.features.length > 32 && <small style={{ color: "var(--muted)", marginTop: 8, display: "block" }}>+{kecGeo.features.length - 32} kecamatan lainnya — klik di peta.</small>}
                </div>
              ) : kecRincianLoading ? (
                <p className="detail-description">Memuat rincian Kec. {kecSelected}...</p>
              ) : kecRincianError ? (
                <div className="form-error" role="alert">Gagal memuat rincian kecamatan: {kecRincianError} <button type="button" className="adm-btn adm-btn-sm" style={{ marginLeft: 8 }} onClick={() => setKecSelected(null)}>Pilih lain</button></div>
              ) : kecRincian ? (
                <div className="rincian-grid">
                  <article className="rincian-card">
                    <h3>Kec. {kecSelected} — partai</h3>
                    <p className="rincian-meta">{kecRincian.jumlah_partai_ada} dari {kecRincian.total_partai} partai ada di kecamatan ini {kecRincian.wilayah?.synthetic ? <em style={{ color: "var(--muted)" }}>(data sintetis — belum ada baris wilayah kecamatan di DB)</em> : null}</p>
                    <ul className="rincian-list">
                      {kecRincian.partai.map((p: any) => (
                        <li key={p.partai_id} className={p.ada ? "is-ada" : "is-tidak"}><span className="rincian-pill" data-ada={p.enum_ada}>{p.enum_ada}</span><strong>{p.partai_nama}</strong><small>{p.ada ? `${n.format(p.jumlah_pendukung)} pend · ${n.format(p.jumlah_penggerak)} penggerak · ${n.format(p.jumlah_pelopor)} pelopor` : "tidak ada"}</small></li>
                      ))}
                    </ul>
                  </article>
                  <article className="rincian-card">
                    <h3>Peran kecamatan — pendukung / penggerak / pelopor</h3>
                    <div className="rincian-peran-grid">
                      <div><span>PENDUKUNG</span><strong>{n.format(kecRincian.peran.total_pendukung)}</strong><i className={kecRincian.peran.ada_pendukung ? "is-ada" : "is-tidak"}>{kecRincian.peran.enum_pendukung}</i></div>
                      <div><span>PENGGERAK</span><strong>{n.format(kecRincian.peran.total_penggerak)}</strong><i className={kecRincian.peran.ada_penggerak ? "is-ada" : "is-tidak"}>{kecRincian.peran.enum_penggerak}</i></div>
                      <div><span>PELOPOR</span><strong>{n.format(kecRincian.peran.total_pelopor)}</strong><i className={kecRincian.peran.ada_pelopor ? "is-ada" : "is-tidak"}>{kecRincian.peran.enum_pelopor}</i></div>
                    </div>
                  </article>
                  <article className="rincian-card">
                    <h3>Kepala desa</h3>
                    <div className="rincian-row"><span>KEPALA DESA</span><strong>{kecRincian.kepala_desa.jumlah} desa</strong><i className={kecRincian.kepala_desa.ada ? "is-ada" : "is-tidak"}>{kecRincian.kepala_desa.enum_ada}</i></div>
                  </article>
                  <article className="rincian-card">
                    <h3>Komunitas senam</h3>
                    <div className="rincian-row"><span>KOMUNITAS SENAM</span><strong>{n.format(kecRincian.komunitas_senam.total_komunitas)} komunitas</strong><i className={kecRincian.komunitas_senam.ada ? "is-ada" : "is-tidak"}>{kecRincian.komunitas_senam.enum_ada}</i></div>
                  </article>
                  <article className="rincian-card rincian-span-2">
                    <h3>Tokoh partai</h3>
                    <div className="rincian-row"><span>TOTAL TOKOH</span><strong>{n.format(kecRincian.tokoh_partai.total_tokoh)} tokoh</strong><i className={kecRincian.tokoh_partai.ada ? "is-ada" : "is-tidak"}>{kecRincian.tokoh_partai.enum_ada}</i></div>
                    {kecRincian.tokoh_partai.daftar.length > 0 && <ul className="rincian-list">{kecRincian.tokoh_partai.daftar.map((t: any) => <li key={t.id}><span className="rincian-pill subtle">{t.jenis_tokoh}</span><strong>{n.format(t.jumlah_tokoh)} tokoh</strong><small>{t.partai_nama ?? "—"}</small></li>)}</ul>}
                  </article>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setKecSelected(null)}>Pilih kecamatan lain</button>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={handleKembaliKab}>← Kembali ke kab/kota</button>
                  </div>
                </div>
              ) : null}
            </section>
          )}

          <section className="member-section" id="members-section">
            <div className="section-heading compact"><div><p className="eyebrow">04 / DIREKTORI ANGGOTA</p><h2>Anggota pilihan</h2></div><span id="member-count" className="count-label">{displayMembers.length} dari {n.format(totals.members)} anggota</span></div>
            <div id="member-list" className="member-list">
              {displayMembers.length ? displayMembers.map((m) => (
                <div key={m.name} className="member-card" onClick={() => { const r = atlasRegions.find((x)=>x.name===m.region); if(r){ setSelectedName(r.name); focusRegionByName(r.name);} }} style={{ cursor:"pointer" }}>
                  <span className="member-avatar">{initials(m.name)}</span><div><strong>{m.name}</strong><small>{m.role} · {m.region}</small></div><i />
                </div>
              )) : <p className="empty-state">Tidak ada anggota yang cocok dengan pencarian.</p>}
            </div>
          </section>
        </main>
        <footer className="atlas-footer"><span>JAWA TENGAH</span><span>SISTEM INFORMASI GEOGRAFIS · V 1.0</span><span>DATA INTERNAL</span></footer>
      </div>
      <div onClick={() => { setRegionBoxOpen(false); setMemberBoxOpen(false); }} style={{ display: regionBoxOpen || memberBoxOpen ? "block" : "none", position: "fixed", inset: 0, zIndex: 5 }} aria-hidden />
    </div>
  );
}
