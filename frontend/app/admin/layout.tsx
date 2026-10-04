import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin — WebGIS Jawa Tengah",
  description: "Dashboard internal WebGIS Jawa Tengah — kelola wilayah, dapil, partai, dan data spasial.",
};

// Login terpisah — tidak dibungkus sidebar/topbar
const LOGIN_EXCLUDED = new Set(["/admin/login"]);

function isExcluded(pathname: string) {
  return LOGIN_EXCLUDED.has(pathname);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Shell akan handle pengecualian login secara client-side juga,
  // tapi di sini kita tetap render shell — client akan unwrap untuk /admin/login.
  return <AdminShell>{children}</AdminShell>;
}
