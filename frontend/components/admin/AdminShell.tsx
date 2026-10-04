"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchMe, clearToken, getToken, type Me } from "@/lib/auth";

type Item = { href: string; label: string; icon: string; roles?: string[]; children?: { href: string; label: string }[] };

const NAV: Item[] = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  {
    href: "/admin/wilayah",
    label: "Data Wilayah",
    icon: "🗺",
    children: [
      { href: "/admin/wilayah?tingkat=provinsi", label: "Provinsi" },
      { href: "/admin/wilayah?tingkat=kabupaten_kota", label: "Kabupaten/Kota" },
      { href: "/admin/wilayah?tingkat=kecamatan", label: "Kecamatan" },
      { href: "/admin/wilayah?tingkat=desa", label: "Desa/Kelurahan" },
    ],
  },
  { href: "/admin/dapil", label: "Dapil", icon: "🗳" },
  { href: "/admin/partai", label: "Partai", icon: "🏛" },
  { href: "/admin/anggota", label: "Data Anggota", icon: "👥" },
  { href: "/admin/suara", label: "Data Suara", icon: "📊" },
  { href: "/admin/analisis", label: "Analisis GIS", icon: "🧭" },
  { href: "/admin/export", label: "Export Data", icon: "⤓" },
  { href: "/admin/pengguna", label: "Manajemen Pengguna", icon: "👤", roles: ["super_admin"] },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [open, setOpen] = useState<string | null>("Data Wilayah");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Login terpisah — tidak dibungkus shell
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      setAuthChecked(true);
      return;
    }
    fetchMe()
      .then((m) => {
        if (!m) {
          clearToken();
          router.replace("/login");
        } else {
          setMe(m);
        }
      })
      .finally(() => setAuthChecked(true));
  }, [pathname, router]);

  if (!authChecked) {
    return (
      <div className="adm-shell" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e7ddd0", borderTopColor: "#1a2a27", margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "#6b7d78", fontWeight: 600 }}>Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  if (!me) {
    // sedang redirect ke /login — jangan flash konten admin
    return null;
  }

  const role = me?.role ?? "user";
  const visible = NAV.filter((it) => !it.roles || it.roles.includes(role));

  return (
    <div className="adm-shell">
      {/* mobile overlay */}
      {mobileOpen && (
        <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`adm-sidebar ${mobileOpen ? "adm-sidebar--open" : ""}`} aria-label="Navigasi admin">
        <div className="adm-side-head">
          <span className="geo-brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>WebGIS Jateng</strong>
            <small>Admin Internal</small>
          </span>
          <button className="adm-side-close md:hidden" onClick={() => setMobileOpen(false)} aria-label="Tutup">
            ✕
          </button>
        </div>

        {me && (
          <div className="adm-user">
            <div className="adm-avatar">{(me.nama ?? me.surel)[0]?.toUpperCase()}</div>
            <div className="min-w-0">
              <div className="adm-user-name">{me.nama ?? me.surel}</div>
              <div className="adm-user-role">
                {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "User"} · {me.dapil_ids.length ? `${me.dapil_ids.length} dapil` : role === "super_admin" ? "semua dapil" : "tanpa dapil"}
              </div>
            </div>
          </div>
        )}

        <nav className="adm-side-nav">
          {visible.map((item) => {
            const active = isActive(pathname, item.href.split("?")[0]);
            const hasChildren = !!item.children?.length;
            const expanded = open === item.label;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`adm-side-item ${active ? "is-active" : ""}`}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault();
                      setOpen(expanded ? null : item.label);
                    } else {
                      setMobileOpen(false);
                    }
                  }}
                >
                  <span className="adm-ico">{item.icon}</span>
                  {item.label}
                  {hasChildren && <span className="adm-caret">{expanded ? "▾" : "▸"}</span>}
                </Link>
                {hasChildren && expanded && (
                  <div className="adm-sub">
                    {item.children!.map((c) => {
                      const subActive = pathname + (typeof window !== "undefined" ? window.location.search : "") === c.href || pathname === c.href.split("?")[0] && new URLSearchParams(c.href.split("?")[1] ?? "").get("tingkat") === new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("tingkat");
                      // simpler: match tingkat param
                      const params = new URLSearchParams(c.href.split("?")[1] ?? "");
                      const cur = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tingkat") : null;
                      const isSubActive = params.get("tingkat") ? cur === params.get("tingkat") && pathname.startsWith("/admin/wilayah") : pathname === c.href;
                      return (
                        <Link key={c.href} href={c.href} className={`adm-sub-item ${isSubActive ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}>
                          {c.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="adm-side-foot">
          <button
            className="adm-side-item"
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
          >
            <span className="adm-ico">↪</span> Keluar
          </button>
          <div className="adm-foot-note">Internal only · bukan public website</div>
        </div>
      </aside>

      <div className="adm-main-wrap">
        <header className="adm-topbar">
          <button className="adm-burger md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
          <div className="adm-top-title">
            <span className="hidden md:inline text-sm font-semibold text-slate-700">WebGIS Jawa Tengah — Admin</span>
            <span className="md:hidden text-sm font-bold">Admin</span>
            {me && <span className="adm-role-badge">{me.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}</span>}
          </div>
          <div className="adm-top-actions">
            <Link href="/" className="adm-pro-btn">
              Lihat Peta Publik
            </Link>
            {!me ? (
              <Link href="/login" className="adm-icon-btn" aria-label="Masuk">
                Masuk
              </Link>
            ) : (
              <span className="adm-avatar" title={me.surel}>
                {(me.nama ?? me.surel)[0]?.toUpperCase()}
              </span>
            )}
          </div>
        </header>

        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
