"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { fetchMe, type Me, apiBase } from "@/lib/auth";
import "leaflet/dist/leaflet.css";

type Ringkasan = {
  wilayah_total: number;
  wilayah_terfilter: number;
  total_penduduk: number;
  total_pemilih: number;
  total_suara: number;
  total_anggota: number;
  role: string;
  dapil_ids: number[] | null;
  is_scoped: boolean;
};

type GeoFeature = {
  type: "Feature";
  properties?: {
    KABUPATEN?: string;
    STATISTIK?: string;
    LUAS_KM2?: string;
  };
};

type GeoCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

const n = new Intl.NumberFormat("id-ID");

function normalizeName(value: string) {
  return value
    .toLocaleLowerCase("id-ID")
    .replace(/\b(kabupaten|kab\.|kota)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function AdminMap({
  selectedRegion,
  onSelect,
}: {
  selectedRegion: string | null;
  onSelect: (name: string, props?: Record<string, string>) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const boundariesRef = useRef<import("leaflet").GeoJSON | null>(null);
  const selectedRef = useRef(selectedRegion);
  const onSelectRef = useRef(onSelect);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    selectedRef.current = selectedRegion;
    if (boundariesRef.current) {
      boundariesRef.current.eachLayer((layer: any) => {
        const name = String(layer.feature?.properties?.KABUPATEN ?? "");
        const isSelected =
          normalizeName(name) === normalizeName(selectedRegion ?? "");
        layer.setStyle({
          color: isSelected ? "#153026" : "#9db5aa",
          weight: isSelected ? 2.5 : 1,
          fillColor: isSelected ? "#1d4033" : "#eaf1ed",
          fillOpacity: isSelected ? 0.85 : 0.45,
        });
      });
    }
  }, [selectedRegion]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = await import("leaflet");
        if (!mapElement.current || cancelled) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(mapElement.current, {
          center: [-7.18, 110.0],
          zoom: 8,
          minZoom: 7,
          maxZoom: 13,
          scrollWheelZoom: true,
          zoomControl: false,
          attributionControl: false,
          maxBoundsViscosity: 1.0,
        });
        mapRef.current = map;

        // Basemap OSM HOT — hanya Jawa Tengah yang terang (mask luar seperti dashboard)
        L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors, Tiles HOT — OSM France',
          subdomains: "abc",
          maxZoom: 19,
        }).addTo(map);
        L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);
        L.control.zoom({ position: "bottomright" }).addTo(map);

        const response = await fetch("/kabupaten-jawa-tengah.geojson");
        if (!response.ok) throw new Error("Gagal mengambil batas wilayah.");
        const geojson = (await response.json()) as GeoCollection;
        if (cancelled) return;

        const layer = L.geoJSON(geojson as any, {
          style: (feature) => {
            const name = String(feature?.properties?.KABUPATEN ?? "");
            const isSelected =
              normalizeName(name) === normalizeName(selectedRef.current ?? "");
            return {
              color: isSelected ? "#153026" : "#9db5aa",
              weight: isSelected ? 2.5 : 1,
              opacity: 1,
              fillColor: isSelected ? "#1d4033" : "#eaf1ed",
              fillOpacity: isSelected ? 0.85 : 0.45,
            };
          },
          onEachFeature(feature, polygon) {
            const name = String(feature.properties?.KABUPATEN ?? "");
            if (!name) return;
            const path = polygon as import("leaflet").Path;
            polygon.bindTooltip(name, {
              sticky: true,
              direction: "center",
              className: "adm-map-tooltip",
            });
            polygon.on({
              click: () => {
                onSelectRef.current(name, feature.properties as Record<string, string>);
              },
              mouseover: () => {
                const isSelected =
                  normalizeName(name) === normalizeName(selectedRef.current ?? "");
                if (!isSelected) {
                  path.setStyle({
                    color: "#1d4033",
                    weight: 1.8,
                    fillColor: "#c2dad0",
                    fillOpacity: 0.7,
                  });
                }
              },
              mouseout: () => {
                const isSelected =
                  normalizeName(name) === normalizeName(selectedRef.current ?? "");
                path.setStyle({
                  color: isSelected ? "#153026" : "#9db5aa",
                  weight: isSelected ? 2.5 : 1,
                  fillColor: isSelected ? "#1d4033" : "#eaf1ed",
                  fillOpacity: isSelected ? 0.85 : 0.45,
                });
              },
            });
          },
        }).addTo(map);

        // Mask luar Jawa Tengah — hanya Jawa Tengah yang terang
        {
          const outerRing: [number, number][] = [
            [-180, 90],
            [180, 90],
            [180, -90],
            [-180, -90],
            [-180, 90],
          ];
          const holes: [number, number][][] = [];
          for (const f of geojson.features as unknown as { geometry?: { type: string; coordinates: unknown } }[]) {
            const g = f.geometry as unknown as { type: string; coordinates: unknown[] };
            if (!g?.coordinates) continue;
            if (g.type === "Polygon") for (const ring of g.coordinates as unknown[][]) holes.push(ring as [number, number][]);
            else if (g.type === "MultiPolygon") for (const poly of g.coordinates as unknown[][][]) for (const ring of poly) holes.push(ring as [number, number][]);
          }
          const maskFeature = {
            type: "Feature" as const,
            properties: {},
            geometry: { type: "Polygon" as const, coordinates: [outerRing, ...holes] },
          };
          L.geoJSON(maskFeature as unknown as import("geojson").GeoJsonObject, {
            style: { fillColor: "#f4f4f3", fillOpacity: 1, color: "transparent", weight: 0, interactive: false } as unknown as import("leaflet").PathOptions,
            interactive: false,
          }).addTo(map);
        }
        layer.bringToFront();

        boundariesRef.current = layer;
        const bounds = layer.getBounds();
        map.fitBounds(bounds, { padding: [18, 18], maxZoom: 8 });
        map.setMaxBounds(bounds.pad(0.08));
        map.options.maxBoundsViscosity = 1.0;
        setTimeout(() => map?.invalidateSize(), 140);
        map.on("moveend", () => {
          const b = layer.getBounds().pad(0.08);
          if (!b.contains(map.getCenter())) map.panInsideBounds(b, { animate: true });
        });
        setMapReady(true);
      } catch (e) {
        if (!cancelled) {
          setMapError(e instanceof Error ? e.message : "Peta gagal dimuat.");
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="relative h-[440px] w-full bg-[#f8f9f8] overflow-hidden rounded-[7px]">
      <div ref={mapElement} className="h-full w-full" />
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-4 text-xs text-red-600">
          {mapError}
        </div>
      )}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa]/80 text-xs text-[#737370] font-mono">
          Memuat spasial Jawa Tengah...
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [data, setData] = useState<Ringkasan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionProps, setRegionProps] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  function loadSummary() {
    const token = typeof window !== "undefined" ? localStorage.getItem("webgis_token") : null;
    if (!token) {
      setLoading(false);
      setErr("Sesi login belum ditemukan. Akses data per-dapil memerlukan otentikasi.");
      return;
    }
    setLoading(true);
    setErr(null);
    fetch(`${apiBase()}/api/analisis/ringkasan`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Gagal mengambil data ringkasan.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const isSuper = me?.role === "super_admin";
  const roleLabel = isSuper ? "Super Admin" : me?.role === "admin" ? "Admin" : me ? "User" : "Tamu";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ringkasan Wilayah & Statistik"
        description="Portal operasional internal WebGIS Provinsi Jawa Tengah. Metrik data di bawah tersinkronisasi sesuai lingkup kewenangan administratif."
        badge={me ? roleLabel : "Internal"}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadSummary}>
              Muat Ulang
            </Button>
            <Link href="/admin/analisis">
              <Button variant="ghost" size="sm">
                Analisis Spasial
              </Button>
            </Link>
            <Link href="/admin/export">
              <Button variant="primary" size="sm">
                Ekspor Data
              </Button>
            </Link>
          </div>
        }
      />

      {/* Scope banner / login warning */}
      {!me ? (
        <div className="rounded-[6px] border border-[#f6e4be] bg-[#fef9ee] px-3.5 py-2.5 text-xs text-[#8a5d14] flex items-center justify-between gap-3">
          <span>
            Anda belum masuk ke sesi internal. Filter data per-dapil tidak aktif.
          </span>
          <Link href="/admin/login">
            <Button variant="ghost" size="sm" className="bg-white">
              Masuk Akun
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-[6px] border border-[#e4e4e3] bg-white px-3.5 py-2 text-xs text-[#555552] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#111110]">
              {me.nama ?? me.surel}
            </span>
            <span className="text-[#888885]">·</span>
            <Badge tone={isSuper ? "violet" : "green"}>
              {isSuper ? "Akses Penuh (Provinsi)" : `Terbatas (${me.dapil_ids.length} Dapil)`}
            </Badge>
            {me.dapil_ids.length > 0 && (
              <span className="font-mono text-[#737370]">
                Dapil ID: #{me.dapil_ids.join(", #")}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-[#888885]">
            Sistem Informasi Geografis Jawa Tengah
          </span>
        </div>
      )}

      {err && (
        <div className="rounded-[6px] border border-[#fca5a5] bg-[#fef2f2] px-3.5 py-2.5 text-xs text-[#b91c1c]">
          {err}
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[8px] border border-[#e4e4e3] bg-white p-3.5">
              <div className="h-3 w-20 animate-pulse rounded bg-[#f0f0ef]" />
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-[#f0f0ef]" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Cakupan Wilayah"
              value={data ? n.format(data.wilayah_terfilter) : "—"}
              hint={data ? `dari ${n.format(data.wilayah_total)} total kab/kota/kec/desa` : "Data wilayah"}
              tone="slate"
            />
            <StatCard
              label="Total Penduduk"
              value={data ? n.format(data.total_penduduk) : "—"}
              hint="Agregat sensus penduduk"
              tone="emerald"
            />
            <StatCard
              label="Daftar Pemilih"
              value={data ? n.format(data.total_pemilih) : "—"}
              hint="Daftar Pemilih Tetap (DPT)"
              tone="slate"
            />
            <StatCard
              label="Perolehan Suara"
              value={data ? n.format(data.total_suara) : "—"}
              hint="Akumulasi pemilu 2024"
              tone="slate"
            />
          </>
        )}
      </div>

      {/* Primary Map Section */}
      <div className="grid gap-3 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#111110]">
                Peta Administrasi Spasial Jawa Tengah
              </h2>
              <p className="text-[11px] text-[#737370] mt-0.5">
                Klik pada poligon kabupaten/kota untuk melihat metadata administratif.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#737370]">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#9db5aa] bg-[#eaf1ed]" />
                Kabupaten/Kota
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm border border-[#153026] bg-[#1d4033]" />
                Terpilih
              </span>
            </div>
          </CardHeader>
          <CardBody className="p-2">
            <AdminMap
              selectedRegion={selectedRegion}
              onSelect={(name, props) => {
                setSelectedRegion(name);
                setRegionProps(props ?? null);
              }}
            />
          </CardBody>
        </Card>

        {/* Region Detail Sidebar */}
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111110]">
                Wilayah Terpilih
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              {selectedRegion ? (
                <div>
                  <div className="text-sm font-semibold text-[#111110]">
                    {selectedRegion}
                  </div>
                  <div className="text-xs text-[#737370] mt-0.5">
                    Provinsi Jawa Tengah
                  </div>

                  <div className="mt-3 divide-y divide-[#f0f0ef] border-y border-[#f0f0ef] text-xs">
                    {regionProps?.STATISTIK && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#737370]">Kode BPS</span>
                        <span className="font-mono font-medium text-[#111110]">
                          {regionProps.STATISTIK}
                        </span>
                      </div>
                    )}
                    {regionProps?.LUAS_KM2 && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#737370]">Luas Wilayah</span>
                        <span className="font-mono font-medium text-[#111110]">
                          {regionProps.LUAS_KM2} km²
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[#737370]">Tingkat</span>
                      <span className="font-medium text-[#111110]">
                        Kabupaten / Kota
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-1.5">
                    <Link
                      href={`/admin/wilayah?q=${encodeURIComponent(selectedRegion)}`}
                      className="w-full"
                    >
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <span>Buka di Master Wilayah</span>
                        <span>→</span>
                      </Button>
                    </Link>
                    <Link
                      href={`/admin/suara?q=${encodeURIComponent(selectedRegion)}`}
                      className="w-full"
                    >
                      <Button variant="subtle" size="sm" className="w-full justify-between">
                        <span>Lihat Data Suara</span>
                        <span>→</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#737370]">
                  <p>Belum ada wilayah dipilih.</p>
                  <p className="mt-1 text-[11px] text-[#888885]">
                    Arahkan kursor atau klik wilayah pada peta di samping.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111110]">
                Direktori Cepat
              </h3>
            </CardHeader>
            <CardBody className="p-2 space-y-1">
              <Link
                href="/admin/wilayah"
                className="flex items-center justify-between rounded-[5px] px-2.5 py-2 text-xs text-[#2a2a29] hover:bg-[#f4f4f3] transition-colors"
              >
                <span>Master Data Wilayah</span>
                <span className="font-mono text-[11px] text-[#888885]">35 Kab/Kota</span>
              </Link>
              <Link
                href="/admin/dapil"
                className="flex items-center justify-between rounded-[5px] px-2.5 py-2 text-xs text-[#2a2a29] hover:bg-[#f4f4f3] transition-colors"
              >
                <span>Daerah Pemilihan (Dapil)</span>
                <span className="font-mono text-[11px] text-[#888885]">Dapil I - XIII</span>
              </Link>
              <Link
                href="/admin/anggota"
                className="flex items-center justify-between rounded-[5px] px-2.5 py-2 text-xs text-[#2a2a29] hover:bg-[#f4f4f3] transition-colors"
              >
                <span>Data Anggota & Kader</span>
                <span className="font-mono text-[11px] text-[#888885]">Pendukung/Kader</span>
              </Link>
              <Link
                href="/admin/suara"
                className="flex items-center justify-between rounded-[5px] px-2.5 py-2 text-xs text-[#2a2a29] hover:bg-[#f4f4f3] transition-colors"
              >
                <span>Hasil Suara Pemilu</span>
                <span className="font-mono text-[11px] text-[#888885]">Rekapitulasi</span>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
