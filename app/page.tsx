"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

type Wilayah = {
  id: number;
  kode_kemendagri: string;
  nama: string;
  tingkat: string;
  parent_id: number | null;
};

type Partai = {
  id: number;
  nama: string;
  slug: string;
  aktif: boolean;
};

type DashboardData = {
  wilayah: Wilayah[];
  partai: Partai[];
};

function normalizeRegionName(value: string) {
  return value.toLocaleLowerCase("id-ID").replace(/\b(kabupaten|kab\.|kota)\b/g, "").replace(/[^a-z0-9]/g, "");
}

function regionStyle(selected: boolean) {
  return {
    color: selected ? "#a55f3f" : "#4e7963",
    weight: selected ? 2.5 : 1.15,
    fillColor: selected ? "#cf8b5e" : "#a8c8ad",
    fillOpacity: selected ? 0.7 : 0.42,
  };
}

function RegionMap({ selectedRegion, onSelect }: { selectedRegion: string | null; onSelect: (name: string) => void }) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const boundaryLayer = useRef<import("leaflet").GeoJSON | null>(null);
  const allBounds = useRef<import("leaflet").LatLngBounds | null>(null);
  const regionBounds = useRef<Record<string, import("leaflet").LatLngBounds>>({});
  const selectedRegionRef = useRef(selectedRegion);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    selectedRegionRef.current = selectedRegion;
  }, [selectedRegion]);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      try {
        const L = await import("leaflet");
        if (!mapElement.current || cancelled) return;

        const map = L.map(mapElement.current, {
          scrollWheelZoom: false,
          zoomControl: true,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        const response = await fetch("/kabupaten-jawa-tengah.geojson");
        if (!response.ok) throw new Error("GeoJSON tidak tersedia");
        const boundaries = (await response.json()) as import("geojson").GeoJsonObject;
        if (cancelled || !map) return;

        const regions = L.geoJSON(boundaries, {
          style: (feature) => regionStyle(normalizeRegionName(String(feature?.properties?.KABUPATEN ?? "")) === normalizeRegionName(selectedRegionRef.current ?? "")),
          onEachFeature(feature, layer) {
            const name = String(feature.properties?.KABUPATEN ?? "Wilayah");
            const key = normalizeRegionName(name);
            const polygonLayer = layer as import("leaflet").Path;
            regionBounds.current[key] = L.geoJSON(feature).getBounds();
            layer.bindPopup(`<strong>${name}</strong><br />Batas kabupaten/kota Jawa Tengah`);
            layer.bindTooltip(name, { sticky: true });
            layer.on({
              click: () => onSelect(name),
              mouseover: () => polygonLayer.setStyle({ color: "#a55f3f", fillColor: "#cf8b5e", fillOpacity: 0.68, weight: 2 }),
              mouseout: () => polygonLayer.setStyle(regionStyle(key === normalizeRegionName(selectedRegionRef.current ?? ""))),
            });
          },
        }).addTo(map);

        boundaryLayer.current = regions;
        allBounds.current = regions.getBounds();
        map.fitBounds(regionBounds.current[normalizeRegionName(selectedRegionRef.current ?? "")] ?? regions.getBounds(), { padding: [18, 18] });
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      } catch {
        if (!cancelled) setMapError(true);
      }
    }

    void renderMap();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      boundaryLayer.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !allBounds.current) return;
    const selected = normalizeRegionName(selectedRegion ?? "");
    map.fitBounds(regionBounds.current[selected] ?? allBounds.current, { padding: [18, 18] });
    boundaryLayer.current?.setStyle((feature) => regionStyle(normalizeRegionName(String(feature?.properties?.KABUPATEN ?? "")) === selected));
  }, [selectedRegion]);

  return (
    <div className="map-frame">
      <div className="map-annotation"><span className="status-dot" /> BATAS ADMINISTRASI · 35 FITUR</div>
      <div ref={mapElement} className="map-canvas" aria-label="Peta batas kabupaten dan kota Jawa Tengah" />
      {mapError && <p className="map-error">Peta tidak dapat dimuat. Periksa koneksi peta dan aset GeoJSON.</p>}
    </div>
  );
}

const numberFormat = new Intl.NumberFormat("id-ID");

export default function Home() {
  const [data, setData] = useState<DashboardData>({ wilayah: [], partai: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (!response.ok) throw new Error("API tidak tersedia");
        const result = (await response.json()) as DashboardData;
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) setApiError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { cancelled = true; };
  }, []);

  const kabupatenKota = data.wilayah.filter((item) => item.tingkat === "kabupaten_kota");
  const kecamatan = data.wilayah.filter((item) => item.tingkat === "kecamatan");
  const activeParties = data.partai.filter((item) => item.aktif);
  const regionMatches = useMemo(() => {
    const query = regionSearch.trim().toLocaleLowerCase("id-ID");
    return query ? data.wilayah.filter((item) => `${item.nama} ${item.kode_kemendagri}`.toLocaleLowerCase("id-ID").includes(query)).slice(0, 6) : [];
  }, [data.wilayah, regionSearch]);
  const partyMatches = useMemo(() => {
    const query = partySearch.trim().toLocaleLowerCase("id-ID");
    return query ? data.partai.filter((item) => item.nama.toLocaleLowerCase("id-ID").includes(query)).slice(0, 6) : [];
  }, [data.partai, partySearch]);
  const visibleWilayah = useMemo(() => {
    const query = regionSearch.trim().toLocaleLowerCase("id-ID");
    return query ? data.wilayah.filter((item) => `${item.nama} ${item.kode_kemendagri}`.toLocaleLowerCase("id-ID").includes(query)) : data.wilayah;
  }, [data.wilayah, regionSearch]);
  const visiblePartai = useMemo(() => {
    const query = partySearch.trim().toLocaleLowerCase("id-ID");
    return query ? data.partai.filter((item) => item.nama.toLocaleLowerCase("id-ID").includes(query)) : data.partai;
  }, [data.partai, partySearch]);
  const matchedRegion = selectedRegion
    ? data.wilayah.find((item) => normalizeRegionName(item.nama) === normalizeRegionName(selectedRegion))
    : undefined;
  const parentRegion = matchedRegion?.parent_id
    ? data.wilayah.find((item) => item.id === matchedRegion.parent_id)
    : undefined;
  const childDistricts = matchedRegion
    ? kecamatan.filter((item) => item.parent_id === matchedRegion.id)
    : [];
  const detailMetrics = !selectedRegion
    ? [
        { label: "BATAS KAB / KOTA", value: "35" },
        { label: "MASTER KAB / KOTA", value: numberFormat.format(kabupatenKota.length) },
        { label: "MASTER KECAMATAN", value: numberFormat.format(kecamatan.length) },
      ]
    : matchedRegion?.tingkat === "kabupaten_kota"
      ? [
          { label: "KECAMATAN", value: numberFormat.format(childDistricts.length) },
          { label: "KODE WILAYAH", value: matchedRegion.kode_kemendagri },
          { label: "STATUS MASTER", value: "TERCATAT" },
        ]
      : matchedRegion?.tingkat === "kecamatan"
        ? [
          { label: "WILAYAH INDUK", value: parentRegion?.nama ?? "Jawa Tengah" },
          { label: "KODE WILAYAH", value: matchedRegion.kode_kemendagri },
          { label: "STATUS MASTER", value: "TERCATAT" },
          ]
        : [
            { label: "LAYER PETA", value: "TERSEDIA" },
            { label: "MASTER API", value: "BELUM ADA" },
            { label: "SUMBER", value: "SHAPEFILE" },
          ];
  const detailDescription = !selectedRegion
    ? `Peta memuat batas kabupaten/kota Jawa Tengah. Master API saat ini memiliki ${kabupatenKota.length} kabupaten/kota dan ${kecamatan.length} kecamatan.`
    : matchedRegion?.tingkat === "kecamatan"
      ? `${selectedRegion} berada di ${parentRegion?.nama ?? "Jawa Tengah"}. Data desa/kelurahan belum tersedia pada master.`
      : matchedRegion
        ? `${selectedRegion} tersedia di master wilayah dengan ${childDistricts.length} kecamatan tercatat.`
        : `${selectedRegion} tersedia di layer batas peta, tetapi belum tercatat di master API.`;
  const masterLevels = [
    { label: "Provinsi", count: data.wilayah.filter((item) => item.tingkat === "provinsi").length },
    { label: "Kabupaten / kota", count: kabupatenKota.length },
    { label: "Kecamatan", count: kecamatan.length },
  ];
  const maxLevelCount = Math.max(1, ...masterLevels.map((item) => item.count));
  const apiStatus = loading ? "MENGHUBUNGKAN" : apiError ? "API TERPUTUS" : "API TERHUBUNG";

  function resetDashboard() {
    setRegionSearch("");
    setPartySearch("");
    setSelectedRegion(null);
  }

  function selectParty(party: Partai) {
    setPartySearch(party.nama);
    document.getElementById(`party-${party.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="Sistem Informasi Geografis Jawa Tengah"><span className="brand-mark"><i /><i /><i /></span><span><strong>SISTEM INFORMASI GEOGRAFIS</strong><small>JAWA TENGAH</small></span></a>
        <nav className="dashboard-nav" aria-label="Navigasi dashboard"><a className="active" href="#overview">Ringkasan</a><a href="#map-section">Peta wilayah</a><a href="#regions-section">Direktori wilayah</a><a href="#parties-section">Data partai</a></nav>
        <div className="topbar-meta"><span className={`status-dot ${apiError ? "offline" : ""}`} /><span>{apiStatus}</span><b>{loading ? "" : `${data.wilayah.length} WILAYAH`}</b></div>
      </header>

      <main>
        <section className="intro" id="overview"><div><p className="eyebrow">PUSAT DATA GEOGRAFIS</p><h1>Mengenal Jawa Tengah<br /><em>lebih dekat.</em></h1><p className="intro-copy">Eksplorasi data wilayah, partai, dan struktur administrasi Jawa Tengah dalam satu pandangan.</p></div><div className="coordinate-note"><span>WILAYAH AKTIF</span><strong>{selectedRegion ?? "Jawa Tengah"}</strong><small>CRS GEOGRAFIS · EPSG:4326</small></div></section>

        <section className="search-row" aria-label="Pencarian data">
          <div className="search-box"><span className="search-icon" aria-hidden="true">⌕</span><label htmlFor="region-search">Cari wilayah Jawa Tengah</label><input id="region-search" type="search" value={regionSearch} onChange={(event) => setRegionSearch(event.target.value)} placeholder="Kabupaten, kecamatan, atau kode..." autoComplete="off" /><div className="search-results" hidden={regionMatches.length === 0} role="listbox" aria-label="Hasil pencarian wilayah">{regionMatches.map((region) => <button className="result-item" key={region.id} type="button" role="option" aria-selected="false" onClick={() => { setSelectedRegion(region.nama); setRegionSearch(region.nama); }}><span>{region.nama}<small>{region.kode_kemendagri}</small></span><b>{region.tingkat.replaceAll("_", " ")}</b></button>)}</div></div>
          <div className="search-box"><span className="search-icon" aria-hidden="true">⌕</span><label htmlFor="party-search">Cari partai</label><input id="party-search" type="search" value={partySearch} onChange={(event) => setPartySearch(event.target.value)} placeholder="Nama partai..." autoComplete="off" /><div className="search-results" hidden={partyMatches.length === 0} role="listbox" aria-label="Hasil pencarian partai">{partyMatches.map((party) => <button className="result-item" key={party.id} type="button" role="option" aria-selected="false" onClick={() => selectParty(party)}><span>{party.nama}<small>{party.slug}</small></span><b>{party.aktif ? "AKTIF" : "NONAKTIF"}</b></button>)}</div></div>
          <button className="filter-button" type="button" onClick={resetDashboard}>Reset tampilan <span aria-hidden="true">↗</span></button>
        </section>

        <section className="stat-grid" aria-label="Ringkasan Jawa Tengah"><article className="stat-card stat-main"><span className="stat-label">BATAS KABUPATEN / KOTA</span><strong>35</strong><span className="stat-trend">FITUR GEOSPASIAL <small>pada layer GeoJSON</small></span></article><article className="stat-card"><span className="stat-label">KABUPATEN / KOTA</span><strong>{loading ? "—" : numberFormat.format(kabupatenKota.length)}</strong><span className="stat-caption">tercatat di master wilayah</span><span className="stat-index">01</span></article><article className="stat-card"><span className="stat-label">KECAMATAN</span><strong>{loading ? "—" : numberFormat.format(kecamatan.length)}</strong><span className="stat-caption">tercatat di master wilayah</span><span className="stat-index">02</span></article><article className="stat-card"><span className="stat-label">PARTAI AKTIF</span><strong>{loading ? "—" : numberFormat.format(activeParties.length)}</strong><span className="stat-caption">terdaftar di sistem</span><span className="stat-index">03</span></article></section>

        <section className="map-section" id="map-section"><div className="section-heading"><div><p className="eyebrow">01 / PETA WILAYAH</p><h2>Jawa Tengah <span>secara keseluruhan.</span></h2></div><div className="map-legend"><span><i className="legend-boundary" /> Batas kabupaten / kota</span></div></div><RegionMap selectedRegion={selectedRegion} onSelect={setSelectedRegion} /></section>

        <section className="content-grid">
          <article className="detail-panel"><div className="section-heading compact"><div><p className="eyebrow">02 / DETAIL WILAYAH</p><h2>{selectedRegion ?? "Jawa Tengah"}</h2></div><span className="type-tag">{matchedRegion?.tingkat.replaceAll("_", " ").toLocaleUpperCase("id-ID") ?? (selectedRegion ? "BATAS PETA" : "PROVINSI")}</span></div><p className="detail-description">{detailDescription}</p><div className="detail-metrics">{detailMetrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div><div className="detail-footer"><span className="pin-icon" aria-hidden="true">⌖</span><span>{apiError ? "API belum terhubung" : `MASTER API · ${data.wilayah.length} BARIS`}</span><button type="button" onClick={() => document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" })}>Fokus peta ↗</button></div></article>
          <article className="chart-panel"><div className="section-heading compact"><div><p className="eyebrow">03 / CAKUPAN MASTER</p><h2>Data per tingkat wilayah</h2></div><div className="chart-badges"><span className="type-tag">API</span><span className="chart-period">LIVE</span></div></div><p className="detail-description">Jumlah baris yang saat ini tersedia pada master wilayah.</p><div className="chart-wrap" role="list" aria-label="Jumlah data berdasarkan tingkat wilayah">{masterLevels.map((level) => <div className="level-row" key={level.label} role="listitem"><span>{level.label}</span><div className="level-track"><i style={{ width: `${Math.max(4, (level.count / maxLevelCount) * 100)}%` }} /></div><b>{numberFormat.format(level.count)}</b></div>)}</div><div className="detail-footer chart-footer"><div className="chart-summary-stat"><span className="pin-icon" aria-hidden="true">⌖</span><span>{numberFormat.format(data.wilayah.length)} record wilayah</span></div><span className="chart-period">DESA BELUM TERSEDIA</span></div></article>
        </section>

        <section className="member-section" id="regions-section"><div className="section-heading compact"><div><p className="eyebrow">04 / MASTER WILAYAH</p><h2>Wilayah terhubung</h2></div><span className="count-label">{loading ? "Memuat..." : `${visibleWilayah.length} dari ${data.wilayah.length} data`}</span></div><div className="member-list">{visibleWilayah.map((region) => <button className="member-card" key={region.id} type="button" onClick={() => { setSelectedRegion(region.nama); document.getElementById("map-section")?.scrollIntoView({ behavior: "smooth" }); }}><span className="member-avatar">{region.nama.split(" ").map((word) => word[0]).slice(-2).join("")}</span><span className="member-info"><strong>{region.nama}</strong><small>{region.kode_kemendagri} · {region.tingkat.replaceAll("_", " ")}</small></span><i /></button>)}{!loading && visibleWilayah.length === 0 && <p className="empty-state">Tidak ada wilayah yang cocok.</p>}{!loading && data.wilayah.length === 0 && <p className="empty-state">Data wilayah belum dapat dimuat dari API.</p>}</div></section>

        <section className="member-section party-section" id="parties-section"><div className="section-heading compact"><div><p className="eyebrow">05 / KELEMBAGAAN</p><h2>Partai terdaftar</h2></div><span className="count-label">{visiblePartai.length} dari {data.partai.length} data</span></div><div className="party-list">{visiblePartai.map((party, index) => <article className="party-card" id={`party-${party.id}`} key={party.id}><span className={`party-mark party-mark-${index % 3}`}>{party.nama.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span><span className="party-name"><strong>{party.nama}</strong><small>{party.slug}</small></span><span className={party.aktif ? "party-status" : "party-status inactive"}>{party.aktif ? "Aktif" : "Nonaktif"}</span></article>)}{!loading && visiblePartai.length === 0 && <p className="empty-state">Tidak ada data partai yang cocok.</p>}</div></section>
      </main>

      <footer className="page-footer"><span>JAWA TENGAH</span><span>SISTEM INFORMASI GEOGRAFIS · WEBGIS</span><span>BATAS ADMINISTRASI · REFERENSI 1999</span></footer>
    </div>
  );
}