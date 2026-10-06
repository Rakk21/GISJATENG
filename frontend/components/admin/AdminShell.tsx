"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchMe, clearToken, getToken, type Me } from "@/lib/auth";

/* ──────────────────────────────────────
   SVG icon components — no emoji, no color
   ────────────────────────────────────── */
function IcoGrid() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}
function IcoMap() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M1 3.5L5.5 2l5 2 4-1.5v10L10.5 14l-5-2-4.5 1.5V3.5z" />
      <path d="M5.5 2v10M10.5 4v10" />
    </svg>
  );
}
function IcoBallot() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M5 8h6M5 5.5h6M5 10.5h4" />
    </svg>
  );
}
function IcoParty() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M2 13L8 3l6 10H2z" />
      <path d="M8 9v2M8 12.5v.5" />
    </svg>
  );
}
function IcoPeople() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5" />
      <path d="M11 7.5c1 .3 2.5 1.5 2.5 3.5" />
      <circle cx="11.5" cy="5" r="1.5" />
    </svg>
  );
}
function IcoBarChart() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M2 13.5V6M6 13.5V3M10 13.5V7M14 13.5V9.5" />
    </svg>
  );
}
function IcoCompass() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M10.5 5.5l-2 4-2.5 1 2-4 2.5-1z" />
    </svg>
  );
}
function IcoDownload() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M8 2v8M5 7.5l3 3 3-3" />
      <path d="M2.5 12h11" />
    </svg>
  );
}
function IcoUser() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="8" cy="5.5" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  );
}
function IcoSettings() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.7M8 12.8v1.7M1.5 8h1.7M12.8 8h1.7M3.5 3.5l1.2 1.2M11.3 11.3l1.2 1.2M11.3 4.7l1.2-1.2M3.5 12.5l1.2-1.2" />
    </svg>
  );
}
function IcoLogout() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" />
      <path d="M10.5 11l3-3-3-3M13.5 8H6" />
    </svg>
  );
}
function IcoGlobe() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 1.5C8 1.5 6 5 6 8s2 6.5 2 6.5M8 1.5C8 1.5 10 5 10 8s-2 6.5-2 6.5M1.5 8h13" />
    </svg>
  );
}
function IcoChevronDown() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
      <path d="M2.5 4.5l3.5 3.5 3.5-3.5" />
    </svg>
  );
}
function IcoChevronRight() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
      <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}
function IcoMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="18" height="18">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </svg>
  );
}
function IcoClose() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" width="14" height="14">
      <path d="M3 3l10 10M13 3L3 13" />
    </svg>
  );
}

/* ──────────────────────────────────────
   Nav structure — grouped by category
   ────────────────────────────────────── */
type NavChild = { href: string; label: string };
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavChild[];
  section?: string; // section heading before this item
};

const NAV: NavItem[] = [
  // ─ Overview
  {
    href: "/admin",
    label: "Dashboard",
    icon: <IcoGrid />,
    section: "Overview",
  },
  // ─ Data
  {
    href: "/admin/wilayah",
    label: "Data Wilayah",
    icon: <IcoMap />,
    section: "Data",
    children: [
      { href: "/admin/wilayah?tingkat=provinsi", label: "Provinsi" },
      { href: "/admin/wilayah?tingkat=kabupaten_kota", label: "Kabupaten/Kota" },
      { href: "/admin/wilayah?tingkat=kecamatan", label: "Kecamatan" },
      { href: "/admin/wilayah?tingkat=desa", label: "Desa/Kelurahan" },
    ],
  },
  { href: "/admin/dapil", label: "Dapil", icon: <IcoBallot /> },
  { href: "/admin/partai", label: "Partai", icon: <IcoParty /> },
  { href: "/admin/anggota", label: "Anggota", icon: <IcoPeople /> },
  { href: "/admin/suara", label: "Data Suara", icon: <IcoBarChart /> },
  // ─ Analisis
  {
    href: "/admin/analisis",
    label: "Analisis GIS",
    icon: <IcoCompass />,
    section: "Analisis",
  },
  { href: "/admin/export", label: "Export Data", icon: <IcoDownload /> },
  // ─ System
  {
    href: "/admin/pengguna",
    label: "Pengguna",
    icon: <IcoUser />,
    roles: ["super_admin"],
    section: "System",
  },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: <IcoSettings /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}

function getCurrentLabel(pathname: string): string {
  for (const item of NAV) {
    if (isActive(pathname, item.href.split("?")[0])) return item.label;
    if (item.children) {
      for (const c of item.children) {
        if (pathname.startsWith(c.href.split("?")[0])) return item.label;
      }
    }
  }
  return "Admin";
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("Data Wilayah");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Login page — render without shell
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
      <div className="adm-shell" style={{ placeItems: "center", display: "grid" }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid var(--adm-border)", borderTopColor: "var(--adm-accent)", margin: "0 auto 10px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 12, color: "var(--adm-faint)", fontWeight: 500 }}>Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  if (!me) return null;

  const role = me?.role ?? "user";
  const visible = NAV.filter((it) => !it.roles || it.roles.includes(role));
  const currentLabel = getCurrentLabel(pathname);

  return (
    <div className="adm-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Tutup menu"
          style={{ position: "fixed", inset: 0, zIndex: 39, background: "rgba(0,0,0,0.3)", border: 0, cursor: "pointer" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`adm-sidebar${mobileOpen ? " adm-sidebar--open" : ""}`}
        aria-label="Navigasi admin"
      >
        {/* Brand */}
        <div className="adm-side-head">
          <span className="geo-brand-symbol" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span>
            <strong>WebGIS Jateng</strong>
            <small>Admin Internal</small>
          </span>
          <button className="adm-side-close" onClick={() => setMobileOpen(false)} aria-label="Tutup sidebar">
            <IcoClose />
          </button>
        </div>

        {/* User strip */}
        <div className="adm-user">
          <span className="adm-avatar" title={me.surel}>
            {(me.nama ?? me.surel)[0]?.toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="adm-user-name">{me.nama ?? me.surel}</div>
            <div className="adm-user-role">
              {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : "User"}
              {" · "}
              {me.dapil_ids.length
                ? `${me.dapil_ids.length} dapil`
                : role === "super_admin"
                ? "semua dapil"
                : "tanpa dapil"}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="adm-side-nav" aria-label="Menu navigasi">
          {visible.map((item) => {
            const active = isActive(pathname, item.href.split("?")[0]);
            const hasChildren = !!item.children?.length;
            const isExpanded = expanded === item.label;

            return (
              <div key={item.href}>
                {item.section && (
                  <div className="adm-side-section">{item.section}</div>
                )}
                <Link
                  href={item.href}
                  className={`adm-side-item${active ? " is-active" : ""}`}
                  onClick={(e) => {
                    if (hasChildren) {
                      e.preventDefault();
                      setExpanded(isExpanded ? null : item.label);
                    } else {
                      setMobileOpen(false);
                    }
                  }}
                >
                  <span className="adm-ico">{item.icon}</span>
                  {item.label}
                  {hasChildren && (
                    <span className="adm-caret">
                      {isExpanded ? <IcoChevronDown /> : <IcoChevronRight />}
                    </span>
                  )}
                </Link>
                {hasChildren && isExpanded && (
                  <div className="adm-sub">
                    {item.children!.map((c) => {
                      const params = new URLSearchParams(c.href.split("?")[1] ?? "");
                      const cur =
                        typeof window !== "undefined"
                          ? new URLSearchParams(window.location.search).get("tingkat")
                          : null;
                      const isSubActive = params.get("tingkat")
                        ? cur === params.get("tingkat") && pathname.startsWith("/admin/wilayah")
                        : pathname === c.href;
                      return (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={`adm-sub-item${isSubActive ? " is-active" : ""}`}
                          onClick={() => setMobileOpen(false)}
                        >
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

        {/* Footer */}
        <div className="adm-side-foot">
          <button
            className="adm-side-item"
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
          >
            <span className="adm-ico"><IcoLogout /></span>
            Keluar
          </button>
          <div className="adm-foot-note">Internal only · bukan public website</div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="adm-main-wrap">
        {/* Topbar */}
        <header className="adm-topbar">
          <button
            className="adm-burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Buka menu"
          >
            <IcoMenu />
          </button>

          <div className="adm-top-title">
            <nav className="adm-breadcrumb" aria-label="Breadcrumb">
              <span className="hidden md:inline">WebGIS Jateng</span>
              <span className="adm-breadcrumb-sep hidden md:inline">/</span>
              <span className="adm-breadcrumb-cur">{currentLabel}</span>
            </nav>
            {me && (
              <span className="adm-role-badge">
                {me.role === "super_admin" ? "Super Admin" : "Admin"}
              </span>
            )}
          </div>

          <div className="adm-top-actions">
            <Link href="/" className="adm-pro-btn hidden md:inline-flex" title="Lihat peta publik">
              <IcoGlobe />
              <span>Peta Publik</span>
            </Link>
            <div className="adm-top-user">
              <span className="adm-avatar" title={me?.surel}>
                {(me?.nama ?? me?.surel)?.[0]?.toUpperCase()}
              </span>
              <span className="adm-top-user-name hidden md:inline">{me?.nama ?? me?.surel}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="adm-content">{children}</div>
      </div>
    </div>
  );
}
