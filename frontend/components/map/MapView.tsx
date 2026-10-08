"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";

// ── helper: ambil nama kabupaten/kota dari properti geojson mana pun ──
function getKabName(props: Record<string, unknown> | undefined): string {
  if (!props) return "Wilayah";
  const v =
    props.KAB_KOTA ??
    props.KABUPATEN ??
    (props as Record<string, unknown>).NAME_2 ??
    (props as Record<string, unknown>).name ??
    "";
  return String(v || "Wilayah").trim();
}

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
  if (!g.type && a.type) return a.type === "kabupaten" && g.base === a.base;
  if (g.type && !a.type) return g.base === a.base;
  return g.base === a.base;
}
function normalizeKab(value: string): string {
  const p = parseKab(value);
  return (p.type ? p.type + " " : "") + p.base;
}

function FitBounds({ data }: { data: GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(data as never);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 9 });
      map.setMaxBounds(bounds.pad(0.14));
      // jaga tetap di Jateng saat drag
      const onMove = () => {
        const b = bounds.pad(0.14);
        if (!b.contains(map.getCenter())) map.panInsideBounds(b, { animate: true });
      };
      map.on("moveend", onMove);
      return () => {
        map.off("moveend", onMove);
      };
    }
  }, [data, map]);
  return null;
}

function JatengMask({ data }: { data: GeoJsonObject }) {
  const map = useMap();
  useEffect(() => {
    const fc = data as unknown as { features: { geometry: { type: string; coordinates: unknown } }[] };
    const outer: [number, number][] = [
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90],
      [-180, 90],
    ];
    const holes: [number, number][][] = [];
    for (const f of fc.features as unknown as { geometry: { type: string; coordinates: unknown } }[]) {
      const g = f.geometry as { type: string; coordinates: unknown[] };
      if (!g?.coordinates) continue;
      if (g.type === "Polygon") {
        for (const ring of g.coordinates as [number, number][][]) holes.push(ring);
      } else if (g.type === "MultiPolygon") {
        for (const poly of g.coordinates as [number, number][][][]) for (const ring of poly) holes.push(ring);
      }
    }
    const maskFeat: GeoJsonObject = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [outer, ...holes] },
    } as unknown as GeoJsonObject;
    const mask = L.geoJSON(maskFeat as never, {
      style: { fillColor: "#f6f5ef", fillOpacity: 1, color: "transparent", weight: 0, interactive: false } as L.PathOptions,
      interactive: false,
    } as never);
    mask.addTo(map);
    (mask as unknown as { bringToBack?: () => void }).bringToBack?.();
    return () => {
      map.removeLayer(mask as unknown as L.Layer);
    };
  }, [data, map]);
  return null;
}

export default function MapView() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    async function fetchFirstOk(urls: string[]): Promise<Response> {
      let lastErr: Error | null = null;
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (r.ok) return r;
          lastErr = new Error(`Gagal memuat GeoJSON (${r.status}) dari ${url}`);
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error(String(e));
        }
      }
      throw lastErr ?? new Error("Gagal memuat GeoJSON");
    }

    async function load() {
      try {
        // prioritas: /geojson/kota.geojson (KAB_KOTA + PROVINSI) lalu fallback ke /kabupaten-jawa-tengah.geojson (KABUPATEN + PROPINSI)
        const res = await fetchFirstOk(["/geojson/kota.geojson", "/kabupaten-jawa-tengah.geojson"]);
        const json = (await res.json()) as unknown as { type: string; features: { properties: Record<string, unknown> }[] } & GeoJsonObject;

        // ── filter HANYA Jawa Tengah ──
        if (Array.isArray((json as unknown as { features: unknown[] }).features)) {
          const feats = (json as unknown as { features: { properties: Record<string, unknown> }[] }).features;
          const hasProvField = feats.some(
            (f) => f.properties?.PROVINSI !== undefined || f.properties?.PROPINSI !== undefined || f.properties?.KODE_PROV !== undefined
          );
          if (hasProvField) {
            const filtered = feats.filter((f) => {
              const p = f.properties;
              if (p.KODE_PROV !== undefined) return String(p.KODE_PROV) === "33";
              const prov = String(p.PROVINSI ?? p.PROPINSI ?? "").toLowerCase();
              return prov.includes("jawa tengah");
            });
            // kalau filter menghasilkan data, pakai itu; kalau kosong tapi semua memang Jateng, biarkan
            if (filtered.length > 0) (json as unknown as { features: unknown[] }).features = filtered as unknown[];
            else if (feats.length === 35) {
              // sudah 35 fitur Jateng (kota.geojson / kabupaten geojson) — biarkan
            }
          }
        }

        if (!cancelled) setGeoData(json as GeoJsonObject);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Gagal memuat GeoJSON");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="h-[600px] w-full overflow-hidden rounded-xl border border-slate-200 flex items-center justify-center text-sm text-slate-500">
        Memuat peta...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="h-[600px] w-full overflow-hidden rounded-xl border border-red-200 bg-red-50 flex items-center justify-center p-4 text-sm text-red-600"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="h-[600px] w-full overflow-hidden rounded-xl border border-slate-200 flex items-center justify-center text-sm text-slate-500">
        Memuat GeoJSON Jawa Tengah...
      </div>
    );
  }

  const isSelected = (props: Record<string, unknown> | undefined) => {
    if (!selected) return false;
    return isSameKabKota(getKabName(props), selected);
  };

  return (
    <div
      className="h-[600px] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm"
      style={{ position: "relative" }}
    >
      <MapContainer
        center={[-7.25, 110.1]}
        zoom={8}
        minZoom={7}
        maxZoom={12}
        maxBoundsViscosity={1.0}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <GeoJSON
          key={selected ?? "all"}
          data={geoData}
          style={(feature) => {
            const sel = isSelected(feature?.properties as Record<string, unknown>);
            return {
              color: sel ? "#1d4033" : "#4a7a64",
              weight: sel ? 2.4 : 1.1,
              opacity: 1,
              fillColor: sel ? "#1d4033" : "#3b82f6",
              fillOpacity: sel ? 0.52 : 0.22,
            } as L.PathOptions;
          }}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as Record<string, unknown>;
            const kabName = getKabName(props);
            const label = kabName.replace(/_/g, " ").replace(/\//g, " / ");
            (layer as L.Layer & { bindTooltip: (c: string, o: L.TooltipOptions) => void }).bindTooltip(
              `<div style="font-weight:700;font-size:12px;color:#1d4033">${label}</div><div style="font-size:11px;color:#7c8983">Jawa Tengah</div><div style="font-size:10px;color:#9db0a8">klik untuk seleksi</div>`,
              { sticky: true, direction: "center", className: "adm-map-tooltip", opacity: 0.98 }
            );
            layer.on({
              mouseover: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                if (!isSelected(props)) target.setStyle({ weight: 1.8, fillOpacity: 0.36 } as L.PathOptions);
                (target as unknown as { bringToFront: () => void }).bringToFront();
              },
              mouseout: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                const sel = isSelected(props);
                target.setStyle({
                  color: sel ? "#1d4033" : "#4a7a64",
                  weight: sel ? 2.4 : 1.1,
                  fillColor: sel ? "#1d4033" : "#3b82f6",
                  fillOpacity: sel ? 0.52 : 0.22,
                } as L.PathOptions);
              },
              click: () => {
                setSelected(kabName);
                // zoom ke kabupaten terpilih
                const b = (layer as unknown as { getBounds: () => L.LatLngBounds }).getBounds();
                const map = (layer as unknown as { _map: L.Map })._map;
                if (b && map) map.fitBounds(b, { padding: [44, 44], maxZoom: 11 });
              },
            });
          }}
        />

        <JatengMask data={geoData} />
        <FitBounds data={geoData} />
      </MapContainer>
      {/* Leaflet attribution sejajar screenshot: Leaflet | © OSM · Dapil 1 */}
      <div
        style={{
          position: "absolute",
          right: 8,
          bottom: 6,
          zIndex: 450,
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 6px",
          borderRadius: 4,
          background: "rgba(255,255,255,0.92)",
          fontSize: 10,
          color: "#64748b",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 12, height: 8, background: "#0478e3", display: "inline-block", borderRadius: 1 }} />
          Leaflet
        </span>
        <span>© OSM · Dapil 1</span>
      </div>
    </div>
  );
}