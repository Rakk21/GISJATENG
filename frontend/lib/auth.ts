"use client";

export type Me = {
  id: number;
  surel: string;
  nama: string | null;
  peran: string;
  role: string;
  dapil_ids: number[];
};

const KEY = "webgis_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setToken(t: string) {
  localStorage.setItem(KEY, t);
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

export function authHeaders(extra: HeadersInit = {}): HeadersInit {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : extra;
}

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";
}

export async function fetchMe(): Promise<Me | null> {
  const t = getToken();
  if (!t) return null;
  const res = await fetch(`${apiBase()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${t}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export function isFailedFetch(e: unknown): boolean {
  const s = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed/i.test(s);
}
