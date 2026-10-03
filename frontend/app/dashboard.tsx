"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Region = {
  id: number;
  kode_kemendagri: string;
  nama: string;
  tingkat: string;
  parent_id: number | null;
};

type Party = {
  id: number;
  nama: string;
  slug: string;
  aktif: boolean;
};

type Metric = "anggota" | "suara" | "penduduk";
type RegionLevel = "kabupaten_kota" | "kecamatan";
type StatisticRow = {
  wilayah: string;
  tingkat: RegionLevel;
  anggota: number;
  suara: number;
  penduduk: number;
};

type GeoFeature = {
  type: "Feature";
  properties?: { KABUPATEN?: string };
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

const numberFormat = new Intl.NumberFormat("id-ID");
const metricLabels: Record<Metric, string> = {
  anggota: "Anggota",
  suara: "Suara",
  penduduk: "Penduduk",
};

const demoRows: Record<Metric, Record<RegionLevel, StatisticRow[]>> = {
  anggota: {
    kabupaten_kota: [
      { wilayah: "Kota Semarang", tingkat: "kabupaten_kota", anggota: 2480, suara: 0, penduduk: 0 },
      { wilayah: "Kabupaten Banyumas", tingkat: "kabupaten_kota", anggota: 2160, suara: 0, penduduk: 0 },
      { wilayah: "Kabupaten Cilacap", tingkat: "kabupaten_kota", anggota: 1940, suara: 0, penduduk: 0 },
      { wilayah: "Kabupaten Demak", tingkat: "kabupaten_kota", anggota: 1730, suara: 0, penduduk: 0 },
      { wilayah: "Kabupaten Klaten", tingkat: "kabupaten_kota", anggota: 1510, suara: 0, penduduk: 0 },
    ],
    kecamatan: [
      { wilayah: "Kecamatan simulasi 01", tingkat: "kecamatan", anggota: 820, suara: 0, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 02", tingkat: "kecamatan", anggota: 690, suara: 0, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 03", tingkat: "kecamatan", anggota: 580, suara: 0, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 04", tingkat: "kecamatan", anggota: 460, suara: 0, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 05", tingkat: "kecamatan", anggota: 390, suara: 0, penduduk: 0 },
    ],
  },
  suara: {
    kabupaten_kota: [
      { wilayah: "Kota Semarang", tingkat: "kabupaten_kota", anggota: 0, suara: 48620, penduduk: 0 },
      { wilayah: "Kabupaten Banyumas", tingkat: "kabupaten_kota", anggota: 0, suara: 42100, penduduk: 0 },
      { wilayah: "Kabupaten Cilacap", tingkat: "kabupaten_kota", anggota: 0, suara: 38740, penduduk: 0 },
      { wilayah: "Kabupaten Demak", tingkat: "kabupaten_kota", anggota: 0, suara: 33280, penduduk: 0 },
      { wilayah: "Kabupaten Klaten", tingkat: "kabupaten_kota", anggota: 0, suara: 29610, penduduk: 0 },
    ],
    kecamatan: [
      { wilayah: "Kecamatan simulasi 01", tingkat: "kecamatan", anggota: 0, suara: 12600, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 02", tingkat: "kecamatan", anggota: 0, suara: 10800, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 03", tingkat: "kecamatan", anggota: 0, suara: 9340, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 04", tingkat: "kecamatan", anggota: 0, suara: 8120, penduduk: 0 },
      { wilayah: "Kecamatan simulasi 05", tingkat: "kecamatan", anggota: 0, suara: 7450, penduduk: 0 },
    ],
  },
  penduduk: {
    kabupaten_kota: [
      { wilayah: "Kota Semarang", tingkat: "kabupaten_kota", anggota: 0, suara: 0, penduduk: 1682100 },
      { wilayah: "Kabupaten Banyumas", tingkat: "kabupaten_kota", anggota: 0, suara: 0, penduduk: 1794800 },
      { wilayah: "Kabupaten Cilacap", tingkat: "kabupaten_kota", anggota: 0, suara: 0, penduduk: 1987500 },
      { wilayah: "Kabupaten Demak", tingkat: "kabupaten_kota", anggota: 0, suara: 0, penduduk: 1233400 },
      { wilayah: "Kabupaten Klaten", tingkat: "kabupaten_kota", anggota: 0, suara: 0, penduduk: 1276100 },
    ],
    kecamatan: [
      { wilayah: "Kecamatan simulasi 01", tingkat: "kecamatan", anggota: 0, suara: 0, penduduk: 176400 },
      { wilayah: "Kecamatan simulasi 02", tingkat: "kecamatan", anggota: 0, suara: 0, penduduk: 152800 },
      { wilayah: "Kecamatan simulasi 03", tingkat: "kecamatan", anggota: 0, suara: 0, penduduk: 139200 },
      { wilayah: "Kecamatan simulasi 04", tingkat: "kecamatan", anggota: 0, suara: 0, penduduk: 121600 },
      { wilayah: "Kecamatan simulasi 05", tingkat: "kecamatan", anggota: 0, suara: 0, penduduk: 108300 },
    ],
  },
};

function normalizeName(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/\b(kabupaten|kab\.|kota)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string): StatisticRow[] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) records.push(row);
  }

  const headers = records.shift()?.map((header) =>
    header.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]/g, ""),
  );
  if (!headers?.length) throw new Error("File CSV kosong atau tidak memiliki judul kolom.");

  const aliases: Record<string, string[]> = {
    wilayah: ["wilayah", "namawilayah", "nama"],
    tingkat: ["tingkat", "level", "jenjang"],
    anggota: ["anggota", "jumlahanggota"],
    suara: ["suara", "jumlahsuara"],
    penduduk: ["penduduk", "jumlahpenduduk"],
  };
  const columns = Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((header) => names.includes(header)),
    ]),
  ) as Record<keyof typeof aliases, number>;

  const missing = Object.entries(columns)
    .filter(([, index]) => index < 0)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Kolom wajib belum lengkap: ${missing.join(", ")}.`);
  }

  const parsed = records.map((cells, index) => {
    const regionName = cells[columns.wilayah] ?? "";
    const rawLevel = (cells[columns.tingkat] ?? "").toLocaleLowerCase("id-ID");
    const level: RegionLevel | null = /kecamatan/.test(rawLevel)
      ? "kecamatan"
      : /kabupaten|kab\.|kota/.test(rawLevel)
        ? "kabupaten_kota"
        : null;
    const numbers = (["anggota", "suara", "penduduk"] as const).map((key) => {
      const value = (cells[columns[key]] ?? "").replace(/[.\s]/g, "").replace(",", ".");
      return value === "" ? 0 : Number(value);
    });

    if (!regionName || !level || numbers.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(`Baris ${index + 2} berisi nama, tingkat, atau angka yang tidak valid.`);
    }

    return {
      wilayah: regionName,
      tingkat: level,
      anggota: numbers[0],
      suara: numbers[1],
      penduduk: numbers[2],
    };
  });

  if (!parsed.length) throw new Error("Tidak ada baris data yang dapat dimuat.");
  return parsed;
}

function RegionMap({
  selectedRegion,
  onSelect,
}: {
  selectedRegion: string | null;
  onSelect: (name: string) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const boundariesRef = useRef<import("leaflet").GeoJSON | null>(null);
  const selectedRef = useRef(selectedRegion);
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selectedRegion;
  }, [selectedRegion]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      let map: import("leaflet").Map | null = null;
      try {
        const L = await import("leaflet");
        if (!mapElement.current || cancelled) return;

        map = L.map(mapElement.current, {
          center: [-7.25, 110.1],
          zoom: 7,
          minZoom: 6,
          maxZoom: 11,
          scrollWheelZoom: false,
          maxBoundsViscosity: 0.85,
          zoomControl: false,
        });
        mapRef.current = map;
        L.control.zoom({ position: "bottomright" }).addTo(map);

        const response = await fetch("/kabupaten-jawa-tengah.geojson");
        if (!response.ok) throw new Error("Batas kabupaten/kota Jawa Tengah tidak dapat dimuat.");
        const geojson = (await response.json()) as GeoCollection;
        if (cancelled) return;
        if (geojson.type !== "FeatureCollection" || !geojson.features?.length) {
          throw new Error("Data batas wilayah kosong atau tidak valid.");
        }

        const layer = L.geoJSON(geojson as import("geojson").GeoJsonObject, {
          style: (feature) => {
            const isSelected =
              normalizeName(String(feature?.properties?.KABUPATEN ?? "")) ===
              normalizeName(selectedRef.current ?? "");
            return {
              color: isSelected ? "#2e5d4f" : "#8aa89a",
              weight: isSelected ? 2 : 1,
              opacity: 1,
              fillColor: isSelected ? "#a9c6b6" : "#dde8e1",
              fillOpacity: isSelected ? 0.72 : 0.42,
            };
          },
          onEachFeature(feature, polygon) {
            const name = String(feature.properties?.KABUPATEN ?? "");
            if (!name) return;
            const path = polygon as import("leaflet").Path;
            polygon.bindTooltip(name, {
              sticky: true,
              direction: "center",
              className: "geo-map-tooltip",
            });
            polygon.on({
              click: () => onSelectRef.current(name),
              mouseover: () => path.setStyle({ color: "#2e5d4f", weight: 1.8, fillOpacity: 0.6 }),
              mouseout: () => {
                const isSelected =
                  normalizeName(name) === normalizeName(selectedRef.current ?? "");
                path.setStyle({
                  color: isSelected ? "#2e5d4f" : "#8aa89a",
                  weight: isSelected ? 2 : 1,
                  fillColor: isSelected ? "#a9c6b6" : "#dde8e1",
                  fillOpacity: isSelected ? 0.72 : 0.42,
                });
              },
            });
          },
        }).addTo(map);

        boundariesRef.current = layer;
        const bounds = layer.getBounds();
        map.fitBounds(bounds, { padding: [34, 34], maxZoom: 8 });
        map.setMaxBounds(bounds.pad(0.16));
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      } catch (error) {
        if (!cancelled) {
          setMapError(error instanceof Error ? error.message : "Peta gagal dimuat.");
        }
      }
    }

    void initializeMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      boundariesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const selected = normalizeName(selectedRegion ?? "");
    boundariesRef.current?.setStyle((feature) => {
      const isSelected =
        normalizeName(String(feature?.properties?.KABUPATEN ?? "")) === selected;
      return {
        color: isSelected ? "#2e5d4f" : "#8aa89a",
        weight: isSelected ? 2 : 1,
        fillColor: isSelected ? "#a9c6b6" : "#dde8e1",
        fillOpacity: isSelected ? 0.72 : 0.42,
      };
    });
  }, [selectedRegion]);

  const focusProvince = useCallback(() => {
    const map = mapRef.current;
    const bounds = boundariesRef.current?.getBounds();
    if (!map || !bounds) return;
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [34, 34], maxZoom: 8, animate: true });
  }, []);

  return (
    <div className="geo-map-frame">
      <div className="geo-map-stamp">
        <span className="geo-live-dot" />
        <span>Jawa Tengah</span>
        <i />
        <span>35 kabupaten / kota</span>
      </div>
      <button className="geo-map-focus" type="button" onClick={focusProvince}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5M3 3l5 5m9-5-5 5m5 9-5-5m-9 5 5-5" /></svg>
        Lihat seluruh provinsi
      </button>
      <div ref={mapElement} className="geo-map-canvas" aria-label="Peta batas kabupaten dan kota Jawa Tengah" />
      {mapError && <p className="geo-map-error" role="alert">{mapError}</p>}
      <div className="geo-map-legend"><span /><span>Batas wilayah</span><b /><span>Dipilih</span></div>
    </div>
  );
}

export default function Dashboard() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [view, setView] = useState<"pengguna" | "admin">("pengguna");
  const [query, setQuery] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [level, setLevel] = useState<RegionLevel>("kecamatan");
  const [metric, setMetric] = useState<Metric>("anggota");
  const [uploadedRows, setUploadedRows] = useState<StatisticRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const insightsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error("API tidak tersedia.");
        const result = (await response.json()) as { wilayah?: Region[]; partai?: Party[] };
        if (!cancelled) {
          setRegions(result.wilayah ?? []);
          setParties(result.partai ?? []);
        }
      } catch {
        if (!cancelled) setApiError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const queryText = query.trim().toLocaleLowerCase("id-ID");
  const regionMatches = useMemo(() => {
    if (!queryText || /anggota|suara|penduduk|terbanyak|tertinggi/.test(queryText)) return [];
    return regions
      .filter((region) => `${region.nama} ${region.kode_kemendagri}`.toLocaleLowerCase("id-ID").includes(queryText))
      .slice(0, 6);
  }, [queryText, regions]);

  const selectedParent = selectedRegion?.parent_id
    ? regions.find((region) => region.id === selectedRegion.parent_id)
    : undefined;
  const selectedMapName =
    selectedRegion?.tingkat === "kecamatan" ? selectedParent?.nama ?? null : selectedRegion?.nama ?? null;
  const countyCount = regions.filter((region) => region.tingkat === "kabupaten_kota").length;
  const districtCount = regions.filter((region) => region.tingkat === "kecamatan").length;
  const activePartyCount = parties.filter((party) => party.aktif).length;

  const chartRows = useMemo(() => {
    const source = uploadedRows.length ? uploadedRows : demoRows[metric][level];
    return source
      .filter((row) => row.tingkat === level)
      .sort((left, right) => right[metric] - left[metric])
      .slice(0, 5);
  }, [level, metric, uploadedRows]);
  const chartMaximum = Math.max(1, ...chartRows.map((row) => row[metric]));
  const isDemo = uploadedRows.length === 0;

  const visibleRegions = useMemo(
    () => regions.filter((region) => region.tingkat === level),
    [level, regions],
  );

  const chooseRegion = useCallback((region: Region) => {
    setSelectedRegion(region);
    setQuery(region.nama);
    setQueryMessage("");
  }, []);

  function submitQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = queryText;
    if (!normalized) {
      setQueryMessage("Ketik nama wilayah atau contoh analisis seperti “anggota terbanyak”.");
      return;
    }

    const requestedMetric: Metric | undefined = /suara/.test(normalized)
      ? "suara"
      : /penduduk/.test(normalized)
        ? "penduduk"
        : /anggota/.test(normalized)
          ? "anggota"
          : undefined;
    if (requestedMetric) {
      setMetric(requestedMetric);
      if (/kota|kabupaten/.test(normalized)) setLevel("kabupaten_kota");
      else if (/kecamatan/.test(normalized)) setLevel("kecamatan");
      setSelectedRegion(null);
      setQueryMessage(
        `Menampilkan peringkat ${metricLabels[requestedMetric].toLocaleLowerCase("id-ID")}${/terbanyak|tertinggi/.test(normalized) ? " terbanyak" : ""}.`,
      );
      insightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const match = regions.find((region) => normalizeName(region.nama) === normalizeName(query));
    if (match) {
      chooseRegion(match);
      document.getElementById("geo-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setQueryMessage("Wilayah belum ditemukan dalam master data Jawa Tengah.");
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    setImportMessage("");
    setImportError(false);
    if (!file.name.toLocaleLowerCase("id-ID").endsWith(".csv")) {
      setImportError(true);
      setImportMessage("Format belum didukung. Silakan pilih file CSV.");
      return;
    }

    try {
      const parsedRows = parseCsv(await file.text());
      setUploadedRows(parsedRows);
      setFileName(file.name);
      setImportMessage(`${numberFormat.format(parsedRows.length)} baris siap ditinjau. Data baru tersimpan sementara di halaman ini.`);
      insightsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      setImportError(true);
      setImportMessage(error instanceof Error ? error.message : "File tidak dapat dibaca.");
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }

  function clearImport() {
    setUploadedRows([]);
    setFileName("");
    setImportMessage("Pratinjau kembali menggunakan data simulasi.");
    setImportError(false);
  }

  const directoryRows = visibleRegions.filter((region) =>
    level === "kecamatan" && selectedRegion?.tingkat === "kabupaten_kota"
      ? region.parent_id === selectedRegion.id
      : true,
  );

  return (
    <div className="geo-dashboard">
      <header className="geo-topbar">
        <a className="geo-brand" href="#geo-overview" aria-label="Ruang Wilayah Jawa Tengah, beranda">
          <span className="geo-brand-symbol"><i /><i /><i /></span>
          <span><strong>Ruang Wilayah</strong><small>Jawa Tengah</small></span>
        </a>
        <nav className="geo-nav" aria-label="Navigasi">
          <a href="#geo-overview">Ringkasan</a>
          <a href="#geo-map-section">Peta</a>
          <a href="#geo-insights">Analisis</a>
          <a href="#geo-directory">Direktori</a>
        </nav>
        <div className="geo-header-actions">
          <span className={`geo-api-status ${apiError ? "is-offline" : ""}`}>
            <i />{loading ? "Memuat data…" : apiError ? "Butuh sambungan API" : "Data siap"}
          </span>
          <div className="geo-view-switch" role="group" aria-label="Mode tampilan">
            <button type="button" className={view === "pengguna" ? "is-active" : ""} onClick={() => setView("pengguna")}>Lihat</button>
            <button type="button" className={view === "admin" ? "is-active" : ""} onClick={() => setView("admin")}>Kelola</button>
          </div>
        </div>
      </header>

      <main className="geo-main">
        <section className="geo-intro" id="geo-overview">
          <div>
            <p className="geo-eyebrow"><span /> Jawa Tengah — peta & data</p>
            <h1>Memahami wilayah,<br /><em>dengan lebih tenang.</em></h1>
            <p className="geo-intro-copy">Satu ruang untuk melihat batas wilayah, membandingkan sebaran, dan menelusuri direktori Jawa Tengah tanpa bising.</p>
          </div>
          <div className="geo-intro-note">
            <span>Cakupan</span>
            <strong>Jawa Tengah</strong>
            <small>35 kabupaten / kota · peta administratif</small>
          </div>
        </section>

        <section className="geo-scope-strip" aria-label="Cakupan data">
          {[
            { label: "Kabupaten / kota", available: countyCount > 0, waitingForApi: loading || apiError },
            { label: "Kecamatan", available: districtCount > 0, waitingForApi: loading || apiError },
            { label: "Desa / kelurahan", available: false, waitingForApi: false },
          ].map((item) => (
            <div className="geo-scope-item" key={item.label}>
              <span className={item.available ? "is-ready" : ""}>{item.available ? "✓" : "·"}</span>
              <div><strong>{item.label}</strong><small>{item.available ? "Tersedia" : item.waitingForApi ? (loading ? "Memuat…" : "Belum terhubung") : "Segera"}</small></div>
            </div>
          ))}
        </section>

        {view === "admin" && (
          <section className="geo-admin-panel" aria-labelledby="geo-admin-title">
            <div className="geo-admin-copy">
              <p className="geo-eyebrow">Kelola data</p>
              <h2 id="geo-admin-title">Impor CSV untuk pratinjau analisis</h2>
              <p>Unggah tabel berisi wilayah, tingkat, anggota, suara, dan penduduk. Data hanya tampil di peramban dan tidak tersimpan permanen.</p>
              <small>Contoh header: <code>wilayah, tingkat, anggota, suara, penduduk</code></small>
            </div>
            <div className="geo-import-actions">
              <input
                ref={importInput}
                className="geo-file-input"
                type="file"
                accept=".csv,text/csv"
                aria-label="Pilih file CSV"
                onChange={(event) => void importCsv(event.currentTarget.files?.[0])}
              />
              <button className="geo-import-button" type="button" onClick={() => importInput.current?.click()}>
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 13V3m0 0L6 7m4-4 4 4M4 12v4h12v-4" /></svg>
                Pilih file
              </button>
              {fileName && <span className="geo-file-name">{fileName}</span>}
              {uploadedRows.length > 0 && <button className="geo-clear-button" type="button" onClick={clearImport}>Bersihkan</button>}
            </div>
            {importMessage && <p className={`geo-import-message ${importError ? "is-error" : ""}`} role={importError ? "alert" : "status"}>{importMessage}</p>}
          </section>
        )}

        <form className="geo-query" onSubmit={submitQuery}>
          <div className="geo-query-input">
            <span className="geo-search-icon" aria-hidden="true">⌕</span>
            <label htmlFor="geo-query-input">Cari wilayah</label>
            <input
              id="geo-query-input"
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setQueryMessage(""); }}
              placeholder="Cari kabupaten, kecamatan, atau coba “anggota terbanyak”"
              autoComplete="off"
            />
            {regionMatches.length > 0 && normalizeName(query) !== normalizeName(selectedRegion?.nama ?? "") && (
              <div className="geo-search-results" role="listbox" aria-label="Saran wilayah">
                {regionMatches.map((region) => (
                  <button type="button" role="option" aria-selected="false" key={region.id} onClick={() => chooseRegion(region)}>
                    <span>{region.nama}<small>{region.kode_kemendagri}</small></span>
                    <b>{region.tingkat.replaceAll("_", " ")}</b>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="geo-query-submit" type="submit">Cari <span>→</span></button>
          {queryMessage && <p className="geo-query-message" role="status">{queryMessage}</p>}
        </form>

        <section className="geo-kpi-grid" aria-label="Ringkasan">
          <article className="geo-kpi geo-kpi-primary"><span>Wilayah terpetakan</span><strong>35</strong><small>kabupaten / kota · batas GeoJSON</small><i>01</i></article>
          <article className="geo-kpi"><span>Kabupaten / kota</span><strong>{loading || apiError ? "—" : numberFormat.format(countyCount)}</strong><small>{apiError ? "Menunggu sambungan API" : "Siap digunakan"}</small><i>02</i></article>
          <article className="geo-kpi"><span>Kecamatan</span><strong>{loading || apiError ? "—" : numberFormat.format(districtCount)}</strong><small>{apiError ? "Menunggu sambungan API" : "Daftar tersedia"}</small><i>03</i></article>
          <article className="geo-kpi"><span>Partai terdaftar</span><strong>{loading || apiError ? "—" : numberFormat.format(activePartyCount)}</strong><small>{apiError ? "Menunggu sambungan API" : "Terhubung"}</small><i>04</i></article>
        </section>

        <section className="geo-map-section" id="geo-map-section">
          <div className="geo-section-heading">
            <div><p className="geo-eyebrow">Peta</p><h2>Jawa Tengah <span>yang bisa dijelajahi</span></h2></div>
            <span className="geo-map-caption">Klik kabupaten / kota untuk detail</span>
          </div>
          <RegionMap selectedRegion={selectedMapName} onSelect={(name) => {
            const matched = regions.find((region) => normalizeName(region.nama) === normalizeName(name));
            if (matched) chooseRegion(matched);
            else {
              setSelectedRegion({
                id: -1,
                nama: name,
                tingkat: "kabupaten_kota",
                parent_id: null,
                kode_kemendagri: "—",
              });
              setQuery(name);
              setQueryMessage("Wilayah dipilih dari geometri peta; data statistiknya belum terhubung ke master API.");
            }
          }} />
          <p className="geo-map-footnote">Hanya batas administratif Jawa Tengah. Tidak ada basemap atau tutupan lahan tambahan — sengaja dibuat sederhana agar fokus.</p>
        </section>

        <section className="geo-selected-panel" aria-live="polite">
          <div className="geo-selected-title">
            <div className="geo-selected-marker"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Z" /><circle cx="10" cy="8" r="2" /></svg></div>
            <div><span>Wilayah terpilih</span><h2>{selectedRegion?.nama ?? "Seluruh Jawa Tengah"}</h2></div>
          </div>
          <div className="geo-selected-facts">
            <div><span>Tingkat</span><strong>{selectedRegion?.tingkat.replaceAll("_", " ") ?? "Provinsi"}</strong></div>
            <div><span>Induk</span><strong>{selectedParent?.nama ?? (selectedRegion?.tingkat === "kabupaten_kota" ? "Jawa Tengah" : "—")}</strong></div>
            <div><span>Status data</span><strong>{uploadedRows.length ? "Pratinjau CSV" : "Contoh"}</strong></div>
          </div>
          {selectedRegion?.tingkat === "kecamatan" && !uploadedRows.length && (
            <p className="geo-district-note">Kecamatan ada di daftar, tapi poligonnya belum tersedia — peta tetap menampilkan batas kabupaten/kota.</p>
          )}
          <button type="button" className="geo-clear-selection" onClick={() => { setSelectedRegion(null); setQuery(""); setQueryMessage(""); }}>Tampilkan semua</button>
        </section>

        <section className="geo-insights" id="geo-insights" ref={insightsRef}>
          <div className="geo-section-heading geo-insights-heading">
            <div><p className="geo-eyebrow">Analisis</p><h2>Lihat sebarannya <span>sekilas</span></h2></div>
            <span className={`geo-data-badge ${isDemo ? "is-demo" : "is-live"}`}>{isDemo ? "Contoh · bukan data asli" : "Pratinjau CSV"}</span>
          </div>
          <div className="geo-filter-row">
            <label><span>Jenis data</span><select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}><option value="anggota">Anggota</option><option value="suara">Suara</option><option value="penduduk">Penduduk</option></select></label>
            <label><span>Tingkat</span><select value={level} onChange={(event) => setLevel(event.target.value as RegionLevel)}><option value="kecamatan">Kecamatan</option><option value="kabupaten_kota">Kabupaten / kota</option></select></label>
            <div className="geo-sort-chip"><span className="geo-sort-arrow">↓</span><span>Urut</span><strong>Terbanyak</strong></div>
            <p>Menampilkan wilayah dengan {metricLabels[metric].toLocaleLowerCase("id-ID")} tertinggi.</p>
          </div>

          <div className="geo-analysis-grid">
            <article className="geo-chart-card">
              <div className="geo-card-heading"><div><p className="geo-eyebrow">Peringkat</p><h3>{metricLabels[metric]} terbanyak</h3></div><span>5 teratas</span></div>
              {chartRows.length > 0 ? (
                <div className="geo-bar-list" role="list" aria-label={`Lima wilayah dengan ${metricLabels[metric].toLocaleLowerCase("id-ID")} terbanyak`}>
                  {chartRows.map((row, index) => (
                    <div className="geo-bar-row" role="listitem" key={`${row.wilayah}-${index}`}>
                      <span className="geo-bar-rank">{String(index + 1).padStart(2, "0")}</span>
                      <div className="geo-bar-content"><div><strong>{row.wilayah}</strong><b>{numberFormat.format(row[metric])}</b></div><span className="geo-bar-track"><i style={{ width: `${Math.max(5, (row[metric] / chartMaximum) * 100)}%` }} /></span></div>
                    </div>
                  ))}
                </div>
              ) : <p className="geo-empty-chart">Belum ada baris {level === "kecamatan" ? "kecamatan" : "kabupaten/kota"} di file CSV ini.</p>}
              <div className="geo-card-foot"><span className="geo-foot-dot" />{isDemo ? "Angka contoh untuk pratinjau" : `${numberFormat.format(chartRows.length)} wilayah dari pratinjau`}</div>
            </article>

            <article className="geo-insight-card">
              <div className="geo-card-heading"><div><p className="geo-eyebrow">Catatan</p><h3>Sekilas analisis</h3></div><span className="geo-insight-icon">✳</span></div>
              <div className="geo-insight-copy">
                <span>{isDemo ? "Contoh" : "Ringkasan"}</span>
                <strong>{metricLabels[metric]} {level === "kecamatan" ? "kecamatan" : "kabupaten / kota"} terbanyak</strong>
                <p>{isDemo ? "Impor CSV di mode Kelola untuk melihat peringkat dari data sebenarnya." : "Peringkat dihitung dari CSV yang kamu unggah di sesi ini."}</p>
              </div>
              <div className="geo-insight-tags"><span>Anggota</span><span>Suara</span><span>Penduduk</span></div>
              <div className="geo-card-foot"><span className="geo-foot-dot" />{uploadedRows.length ? `${numberFormat.format(uploadedRows.length)} baris · sesi ini` : "Belum ada CSV yang diimpor"}</div>
            </article>
          </div>
        </section>

        <section className="geo-directory" id="geo-directory">
          <div className="geo-section-heading">
            <div><p className="geo-eyebrow">Direktori</p><h2>Telusuri <span>Jawa Tengah</span></h2></div>
            <span className="geo-directory-count">{loading ? "Memuat…" : apiError ? "Butuh sambungan API" : `${numberFormat.format(directoryRows.length)} wilayah`}</span>
          </div>
          <div className="geo-directory-controls">
            <label htmlFor="geo-directory-level">Tampilkan</label>
            <select id="geo-directory-level" value={level} onChange={(event) => setLevel(event.target.value as RegionLevel)}>
              <option value="kecamatan">Kecamatan</option>
              <option value="kabupaten_kota">Kabupaten / kota</option>
            </select>
            <span>{level === "kecamatan" ? "Pilih kabupaten/kota di peta untuk melihat kecamatannya." : "Semua kabupaten/kota di Jawa Tengah."}</span>
          </div>
          <div className="geo-region-list">
            {directoryRows.slice(0, 24).map((region) => (
              <button type="button" className={selectedRegion?.id === region.id ? "is-selected" : ""} key={region.id} onClick={() => {
                chooseRegion(region);
                document.getElementById("geo-map-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}>
                <span className="geo-region-symbol">{region.nama.split(" ").map((part) => part[0]).slice(-2).join("")}</span>
                <span className="geo-region-copy"><strong>{region.nama}</strong><small>{region.tingkat.replaceAll("_", " ")} · {region.kode_kemendagri}</small></span>
                <span className="geo-region-arrow">↗</span>
              </button>
            ))}
            {!loading && directoryRows.length === 0 && <p className="geo-empty-chart">{apiError ? "API wilayah belum terhubung. Peta batas provinsi tetap dapat digunakan." : "Belum ada wilayah di tingkat ini."}</p>}
          </div>
        </section>

        <footer className="geo-footer">
          <span><strong>Ruang Wilayah</strong> · Jawa Tengah</span>
          <span>Geometri GeoJSON · {uploadedRows.length ? "Statistik dari pratinjau CSV" : "Statistik menunggu data"}</span>
        </footer>
      </main>
    </div>
  );
}
