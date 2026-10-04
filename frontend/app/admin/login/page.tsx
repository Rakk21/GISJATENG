"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-sm text-slate-600">Mengalihkan ke halaman login...</p>
      <a href="/login" className="mt-2 inline-block text-sm font-semibold text-slate-900 underline">
        Buka /login
      </a>
    </div>
  );
}
