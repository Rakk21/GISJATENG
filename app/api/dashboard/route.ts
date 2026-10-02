import { NextResponse } from "next/server";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:8080";

export async function GET() {
  try {
    const [wilayahResponse, partaiResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/wilayah/`, { cache: "no-store" }),
      fetch(`${apiBaseUrl}/api/partai/`, { cache: "no-store" }),
    ]);

    if (!wilayahResponse.ok || !partaiResponse.ok) {
      return NextResponse.json({ error: "Backend API gagal dibaca." }, { status: 502 });
    }

    const [wilayah, partai] = await Promise.all([
      wilayahResponse.json(),
      partaiResponse.json(),
    ]);

    return NextResponse.json({ wilayah, partai });
  } catch {
    return NextResponse.json({ error: "Backend API tidak dapat dijangkau." }, { status: 503 });
  }
}