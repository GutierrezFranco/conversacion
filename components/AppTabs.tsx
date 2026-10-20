"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app", label: "✂ Editá tu reel" },
  { href: "/app/imagenes", label: "Generador de imágenes" },
  { href: "/app/videos", label: "Generador de videos" },
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
