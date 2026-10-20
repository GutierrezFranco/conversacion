import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand />
          <div className="spacer" />
          <Link href="/app" className="btn btn-primary">
            Ir a la app
          </Link>
        </div>
      </header>
      <main className="container legal">
        <h1>{title}</h1>
        {updated && <p className="muted small">Última actualización: {updated}</p>}
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
