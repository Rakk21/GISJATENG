// ── Data Atlas — identik dengan DashboardController.php sistem_informasi_pengurus ──
export type AtlasRegion = {
  name: string;
  type: "Kabupaten" | "Kota";
  dapil: string; // "Dapil Jateng VIII" dst
  kecamatan: number;
  desa: number;
  members: number;
  dapil_ri_number: number;
  dapil_provinsi_number: number | null;
  dapil_ri: string;
  dapil_provinsi: string;
};

export type AtlasMember = { name: string; role: string; region: string; party: string };

const romanToNumber: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };

const provincialDapil: Record<number, string[]> = {
  1: ["Kota Semarang"],
  2: ["Kabupaten Semarang", "Kabupaten Kendal", "Kota Salatiga"],
  3: ["Kabupaten Kudus", "Kabupaten Jepara", "Kabupaten Demak"],
  4: ["Kabupaten Pati", "Kabupaten Rembang"],
  5: ["Kabupaten Grobogan", "Kabupaten Blora"],
  6: ["Kabupaten Wonogiri", "Kabupaten Karanganyar", "Kabupaten Sragen"],
  7: ["Kabupaten Klaten", "Kabupaten Sukoharjo", "Kota Surakarta"],
  8: ["Kabupaten Magelang", "Kabupaten Boyolali", "Kota Magelang"],
  9: ["Kabupaten Purworejo", "Kabupaten Wonosobo", "Kabupaten Temanggung"],
  10: ["Kabupaten Purbalingga", "Kabupaten Banjarnegara", "Kabupaten Kebumen"],
  11: ["Kabupaten Cilacap", "Kabupaten Banyumas"],
  12: ["Kabupaten Tegal", "Kabupaten Brebes", "Kota Tegal"],
  13: ["Kabupaten Batang", "Kabupaten Pekalongan", "Kabupaten Pemalang", "Kota Pekalongan"],
};

const provincialByRegion: Record<string, number> = {};
for (const [num, names] of Object.entries(provincialDapil)) for (const n of names) provincialByRegion[n] = Number(num);

const rawRegions: Omit<AtlasRegion, "dapil_ri_number" | "dapil_provinsi_number" | "dapil_ri" | "dapil_provinsi">[] = [
  { name: "Kabupaten Cilacap", type: "Kabupaten", dapil: "Dapil Jateng VIII", kecamatan: 24, desa: 269, members: 184 },
  { name: "Kabupaten Banyumas", type: "Kabupaten", dapil: "Dapil Jateng VIII", kecamatan: 27, desa: 331, members: 226 },
  { name: "Kabupaten Purbalingga", type: "Kabupaten", dapil: "Dapil Jateng VII", kecamatan: 18, desa: 239, members: 141 },
  { name: "Kabupaten Banjarnegara", type: "Kabupaten", dapil: "Dapil Jateng VII", kecamatan: 20, desa: 278, members: 132 },
  { name: "Kabupaten Kebumen", type: "Kabupaten", dapil: "Dapil Jateng VII", kecamatan: 26, desa: 449, members: 193 },
  { name: "Kabupaten Purworejo", type: "Kabupaten", dapil: "Dapil Jateng VI", kecamatan: 16, desa: 494, members: 118 },
  { name: "Kabupaten Wonosobo", type: "Kabupaten", dapil: "Dapil Jateng VI", kecamatan: 15, desa: 265, members: 104 },
  { name: "Kabupaten Magelang", type: "Kabupaten", dapil: "Dapil Jateng VI", kecamatan: 21, desa: 367, members: 208 },
  { name: "Kabupaten Boyolali", type: "Kabupaten", dapil: "Dapil Jateng V", kecamatan: 22, desa: 267, members: 174 },
  { name: "Kabupaten Klaten", type: "Kabupaten", dapil: "Dapil Jateng V", kecamatan: 26, desa: 401, members: 221 },
  { name: "Kabupaten Sukoharjo", type: "Kabupaten", dapil: "Dapil Jateng V", kecamatan: 12, desa: 167, members: 156 },
  { name: "Kabupaten Wonogiri", type: "Kabupaten", dapil: "Dapil Jateng IV", kecamatan: 25, desa: 294, members: 129 },
  { name: "Kabupaten Karanganyar", type: "Kabupaten", dapil: "Dapil Jateng IV", kecamatan: 17, desa: 162, members: 148 },
  { name: "Kabupaten Sragen", type: "Kabupaten", dapil: "Dapil Jateng IV", kecamatan: 20, desa: 208, members: 171 },
  { name: "Kabupaten Grobogan", type: "Kabupaten", dapil: "Dapil Jateng III", kecamatan: 19, desa: 280, members: 186 },
  { name: "Kabupaten Blora", type: "Kabupaten", dapil: "Dapil Jateng III", kecamatan: 16, desa: 295, members: 137 },
  { name: "Kabupaten Rembang", type: "Kabupaten", dapil: "Dapil Jateng III", kecamatan: 14, desa: 294, members: 126 },
  { name: "Kabupaten Pati", type: "Kabupaten", dapil: "Dapil Jateng III", kecamatan: 21, desa: 401, members: 215 },
  { name: "Kabupaten Kudus", type: "Kabupaten", dapil: "Dapil Jateng II", kecamatan: 9, desa: 132, members: 164 },
  { name: "Kabupaten Jepara", type: "Kabupaten", dapil: "Dapil Jateng II", kecamatan: 16, desa: 195, members: 152 },
  { name: "Kabupaten Demak", type: "Kabupaten", dapil: "Dapil Jateng II", kecamatan: 14, desa: 249, members: 189 },
  { name: "Kabupaten Semarang", type: "Kabupaten", dapil: "Dapil Jateng I", kecamatan: 19, desa: 208, members: 176 },
  { name: "Kabupaten Temanggung", type: "Kabupaten", dapil: "Dapil Jateng VI", kecamatan: 20, desa: 289, members: 139 },
  { name: "Kabupaten Kendal", type: "Kabupaten", dapil: "Dapil Jateng I", kecamatan: 20, desa: 286, members: 143 },
  { name: "Kabupaten Batang", type: "Kabupaten", dapil: "Dapil Jateng X", kecamatan: 15, desa: 248, members: 128 },
  { name: "Kabupaten Pekalongan", type: "Kabupaten", dapil: "Dapil Jateng X", kecamatan: 19, desa: 285, members: 198 },
  { name: "Kabupaten Pemalang", type: "Kabupaten", dapil: "Dapil Jateng X", kecamatan: 14, desa: 211, members: 177 },
  { name: "Kabupaten Tegal", type: "Kabupaten", dapil: "Dapil Jateng IX", kecamatan: 18, desa: 281, members: 204 },
  { name: "Kabupaten Brebes", type: "Kabupaten", dapil: "Dapil Jateng IX", kecamatan: 17, desa: 297, members: 230 },
  { name: "Kota Magelang", type: "Kota", dapil: "Dapil Jateng VI", kecamatan: 3, desa: 17, members: 45 },
  { name: "Kota Surakarta", type: "Kota", dapil: "Dapil Jateng V", kecamatan: 5, desa: 54, members: 92 },
  { name: "Kota Salatiga", type: "Kota", dapil: "Dapil Jateng I", kecamatan: 4, desa: 23, members: 48 },
  { name: "Kota Semarang", type: "Kota", dapil: "Dapil Jateng I", kecamatan: 16, desa: 177, members: 257 },
  { name: "Kota Pekalongan", type: "Kota", dapil: "Dapil Jateng X", kecamatan: 4, desa: 27, members: 59 },
  { name: "Kota Tegal", type: "Kota", dapil: "Dapil Jateng IX", kecamatan: 4, desa: 27, members: 62 },
];

export const atlasRegions: AtlasRegion[] = rawRegions.map((r) => {
  const roman = r.dapil.replace("Dapil Jateng ", "");
  const riNum = romanToNumber[roman] ?? 1;
  const provNum = provincialByRegion[r.name] ?? null;
  return { ...r, dapil_ri_number: riNum, dapil_provinsi_number: provNum, dapil_ri: `Dapil RI ${riNum}`, dapil_provinsi: provNum ? `Dapil Provinsi ${provNum}` : "Dapil Provinsi -" };
});

export const atlasMembers: AtlasMember[] = [
  { name: "Arif Nugroho", role: "Koordinator Wilayah", region: "Kota Semarang", party: "Jawa Tengah" },
  { name: "Dewi Lestari", role: "Anggota Kabupaten", region: "Kabupaten Banyumas", party: "Jawa Tengah" },
  { name: "Bambang Santoso", role: "Anggota Kabupaten", region: "Kabupaten Klaten", party: "Jawa Tengah" },
  { name: "Siti Rahmawati", role: "Anggota Kota", region: "Kota Surakarta", party: "Jawa Tengah" },
  { name: "Fajar Hidayat", role: "Anggota Kabupaten", region: "Kabupaten Brebes", party: "Jawa Tengah" },
  { name: "Nadia Permata", role: "Anggota Kabupaten", region: "Kabupaten Pati", party: "Jawa Tengah" },
];

export const kabupatenKotaOptions: string[] = [
  "Kabupaten Banjarnegara","Kabupaten Banyumas","Kabupaten Batang","Kabupaten Blora","Kabupaten Boyolali","Kabupaten Brebes","Kabupaten Cilacap","Kabupaten Demak","Kabupaten Grobogan","Kabupaten Jepara","Kabupaten Karanganyar","Kabupaten Kebumen","Kabupaten Kendal","Kabupaten Klaten","Kabupaten Kudus","Kabupaten Magelang","Kabupaten Pati","Kabupaten Pekalongan","Kabupaten Pemalang","Kabupaten Purbalingga","Kabupaten Purworejo","Kabupaten Rembang","Kabupaten Semarang","Kabupaten Sragen","Kabupaten Sukoharjo","Kabupaten Tegal","Kabupaten Temanggung","Kabupaten Wonogiri","Kabupaten Wonosobo","Kota Magelang","Kota Pekalongan","Kota Salatiga","Kota Semarang","Kota Surakarta","Kota Tegal",
];

export function getAtlasTotals(regions: AtlasRegion[] = atlasRegions) {
  return {
    districts: regions.length,
    subdistricts: regions.reduce((s, r) => s + r.kecamatan, 0),
    villages: regions.reduce((s, r) => s + r.desa, 0),
    members: regions.reduce((s, r) => s + r.members, 0),
  };
}

export function filterRegionsByScope(
  regions: AtlasRegion[],
  scope: { dapil_type: "ri" | "provinsi" | "kabupaten_kota"; dapil_number?: number; kabupaten_kota?: string } | null,
): { filtered: AtlasRegion[]; label: string | null; dapilInfo: Record<string, unknown> | null } {
  if (!scope) return { filtered: regions, label: null, dapilInfo: null };
  if (scope.dapil_type === "kabupaten_kota" && scope.kabupaten_kota) {
    const m = regions.find((r) => r.name === scope.kabupaten_kota) ?? null;
    const filtered = regions.filter((r) => r.name === scope.kabupaten_kota);
    return { filtered, label: scope.kabupaten_kota, dapilInfo: m ? { kabupaten_kota: m.name, type: m.type, dapil_ri_number: m.dapil_ri_number, dapil_provinsi_number: m.dapil_provinsi_number, dapil_ri: m.dapil_ri, dapil_provinsi: m.dapil_provinsi, kecamatan: m.kecamatan, desa: m.desa, members: m.members } : null };
  }
  if ((scope.dapil_type === "ri" || scope.dapil_type === "provinsi") && scope.dapil_number) {
    const key = scope.dapil_type === "ri" ? "dapil_ri_number" : "dapil_provinsi_number";
    const filtered = regions.filter((r) => (r as Record<string, unknown>)[key] === scope.dapil_number);
    const label = scope.dapil_type === "ri" ? `Dapil RI ${scope.dapil_number}` : `Dapil Provinsi ${scope.dapil_number}`;
    return { filtered, label, dapilInfo: { scope_type: scope.dapil_type, scope_number: scope.dapil_number, scope_label: label, districts: filtered.length } };
  }
  return { filtered: regions, label: null, dapilInfo: null };
}
