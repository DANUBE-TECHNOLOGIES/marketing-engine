"use client";

import { usePathname } from "next/navigation";
import AdminEngineNav from "./AdminEngineNav";

export default function RouteAwareAdminEngineNav() {
  const pathname = usePathname() || "";

  // Public Group Funnel pages must never expose the Local Engine shell.
  if (pathname === "/groupes" || pathname.startsWith("/groupes/")) {
    return null;
  }

  return <AdminEngineNav />;
}
