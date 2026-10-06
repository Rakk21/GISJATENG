"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoJsonObject } from "geojson";
import L from "leaflet";

function FitBounds({ data }: { data: GeoJsonObject }) {
  const map = useMap();

  useEffect(() => {
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
      });
    }
  }, [data, map]);

  return null;
}

export default function MapView() {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/geojson/kota.geojson");

        if (!res.ok) {
          throw new Error(`Gagal memuat GeoJSON (${res.status})`);
        }

        const json = (await res.json()) as GeoJsonObject;

        if (!cancelled) {
          setGeoData(json);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Gagal memuat GeoJSON"
          );
        }
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
        Memuat GeoJSON...
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={[-7.15, 110.14]}
        zoom={8}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          data={geoData}
          style={{
            color: "#334155",
            weight: 1,
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
          }}
        />

        <FitBounds data={geoData} />
      </MapContainer>
    </div>
  );
}