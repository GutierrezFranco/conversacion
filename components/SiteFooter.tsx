import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="stack">
          <Brand />
          <span className="muted small">Tus reels editados, sin editar vos.</span>
        </div>
        <nav className="footer-links">
          <Link href="/#precios">Precios</Link>
          <Link href="/contacto">Ayuda y contacto</Link>
          <Link href="/terminos">Términos y condiciones</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/arrepentimiento">Botón de arrepentimiento</Link>
        </nav>
      </div>
      <div className="container muted small" style={{ marginTop: 18 }}>
        © {new Date().getFullYear()} {SITE.legalName}. Hecho en Argentina.
      </div>
    </footer>
  );
}
