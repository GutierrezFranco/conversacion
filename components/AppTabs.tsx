"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { AI_GENERATORS } from "@/lib/features";

type Tab = { href: string; label: string; short: string; icon: string };

const tabs: Tab[] = [
  { href: "/app", label: "Editá tu reel", short: "Editar", icon: "edit" },
  { href: "/app/recursos", label: "Mis recursos", short: "Recursos", icon: "folder" },
  { href: "/app/cajitas", label: "Cajitas y comentarios", short: "Cajitas", icon: "chat" },
  ...(AI_GENERATORS
    ? [
        { href: "/app/imagenes", label: "Imágenes con IA", short: "Imágenes", icon: "folder" },
        { href: "/app/videos", label: "Videos con IA", short: "Videos", icon: "edit" },
      ]
    : []),
  { href: "/app/creditos", label: "Créditos", short: "Créditos", icon: "coin" },
];

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" || pathname.startsWith("/app/reel") : pathname.startsWith(href);
}

// Pestañas arriba en la compu y barra fija abajo en el celular, como una app.
export function AppTabs() {
  const pathname = usePathname();
  return (
    <>
      <nav className="tabs" aria-label="Secciones">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={`tab ${isActive(pathname, t.href) ? "active" : ""}`}>
            <Icon name={t.icon} size={18} />
            {t.label}
          </Link>
        ))}
      </nav>
      <nav className="bottom-nav" aria-label="Secciones">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={isActive(pathname, t.href) ? "active" : ""}>
            <Icon name={t.icon} />
            <span>{t.short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
