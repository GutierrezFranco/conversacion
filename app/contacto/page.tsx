import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { SITE, whatsappLink } from "@/lib/site";

export const metadata = { title: "Ayuda y contacto" };

const help = [
  { q: "Mi video quedó «En cola» hace mucho", a: "Puede haber muchos videos editándose a la vez. Si pasa más de media hora, escribinos con el nombre del reel." },
  { q: "La edición falló", a: "Te devolvemos los créditos automáticamente. Probá subirlo de nuevo; si vuelve a fallar, escribinos." },
  { q: "No me llega el mail para entrar", a: "Fijate en spam o promociones. También podés entrar con Google." },
  { q: "Pagué y no veo los créditos", a: "Mercado Pago puede tardar unos minutos en confirmar el pago. Si pasa más de una hora, escribinos con el número de operación." },
];

export default function ContactPage() {
  const wa = whatsappLink("Hola, necesito ayuda con Edición Simple");
  return (
    <LegalPage title="Ayuda y contacto">
      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <a className="card selectable" href={`mailto:${SITE.email}`} style={{ textDecoration: "none" }}>
          <b>Escribinos por mail</b>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            {SITE.email}
          </p>
        </a>
        {wa && (
          <a className="card selectable" href={wa} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            <b>Escribinos por WhatsApp</b>
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Te respondemos en horario comercial.
            </p>
          </a>
        )}
      </div>
      <h2>Preguntas frecuentes</h2>
      <div className="stack">
        {help.map((h) => (
          <details key={h.q} className="card faq">
            <summary>{h.q}</summary>
            <p className="muted" style={{ marginBottom: 0 }}>
              {h.a}
            </p>
          </details>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 24 }}>
        Mirá también los <Link href="/terminos">términos y condiciones</Link> y la <Link href="/privacidad">política de privacidad</Link>.
      </p>
    </LegalPage>
  );
}
