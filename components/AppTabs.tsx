"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AI_GENERATORS } from "@/lib/features";

const tabs = [
  { href: "/app", label: "✂ Editá tu reel" },
  { href: "/app/recursos", label: "Mis recursos" },
  { href: "/app/cajitas", label: "Cajitas y comentarios" },
  ...(AI_GENERATORS
    ? [
        { href: "/app/imagenes", label: "Imágenes con IA" },
        { href: "/app/videos", label: "Videos con IA" },
      ]
    : []),
  { href: "/app/creditos", label: "Créditos" },
];

export function AppTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs">
      {tabs.map((t) => {
        const active = t.href === "/app" ? pathname === "/app" || pathname.startsWith("/app/reel") : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
