import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { FORMATS } from "@/lib/formats";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, ITERATION_CREDITS, PACKS, PREMIUM_EDIT_CREDITS, formatArs, pricePerVideo } from "@/lib/pricing";
import { STYLES, isPremium } from "@/lib/styles";

const editPrice = formatArs(EDIT_CREDITS * CREDIT_PRICE_ARS);
const premiumPrice = formatArs(PREMIUM_EDIT_CREDITS * CREDIT_PRICE_ARS);
const iterationPrice = formatArs(ITERATION_CREDITS * CREDIT_PRICE_ARS);
const maxPrice = formatArs((EDIT_CREDITS + ITERATION_CREDITS) * CREDIT_PRICE_ARS);

const pains = [
  { title: "Grabás, pero no publicás", text: "El video de la reparación queda en la galería porque no tenés tiempo de sentarte a editarlo." },
  { title: "Editar te come el día", text: "Cortar, poner subtítulos y acomodar fotos te lleva una hora por reel. Esa hora es de taller." },
  { title: "Un editor no te cierra", text: "Para la cantidad de videos que querés subir, pagarle a alguien todos los meses sale caro." },
];

const whatWeDo = [
  "Cortamos errores, muletillas, frases repetidas y silencios",
  "Subtítulos grandes con las palabras clave destacadas",
  "Tus fotos de antes y después, justo cuando las nombrás",
  "Cajita de preguntas, precio y llamado a la acción",
  "Zooms para remarcar lo importante",
  "Música de fondo que baja sola cuando hablás",
];

const steps = [
  { n: "1", title: "Subí tu crudo", text: "Tal cual lo grabaste con el celular, con errores, silencios y todo." },
  { n: "2", title: "Elegí formato y estilo", text: "Sumá tus fotos, el precio o una cajita de preguntas. Si querés, escribí indicaciones." },
  { n: "3", title: "Descargalo y publicalo", text: "En minutos lo tenés listo. ¿Algo no te gusta? Pedí cambios y lo volvemos a editar." },
];

const comparison = [
  { label: "Tiempo por reel", you: "1 hora o más", editor: "Esperar días", us: "Minutos" },
  { label: "Qué tenés que saber", you: "Aprender CapCut", editor: "Explicar qué querés", us: "Nada: subís y elegís" },
  { label: "Costo", you: "Tu tiempo de taller", editor: "Un sueldo o un fijo mensual", us: `${editPrice} por video, sin abono` },
  { label: "Si no te gusta", you: "Rehacerlo vos", editor: "Pedir y esperar", us: `Pedís cambios por ${iterationPrice}` },
];

const faqs = [
  { q: "¿Necesito saber editar?", a: "No. Subís el video, elegís un formato y un estilo, y listo. Si querés, le escribís indicaciones como se las darías a un editor: «sacá la parte donde me trabo»." },
  { q: "¿Cuánto tarda?", a: "Normalmente entre 2 y 6 minutos (un poco más con los estilos premium). Podés cerrar la página y volver después: queda guardado en «Tus reels»." },
  { q: "¿Qué diferencia hay entre normal y premium?", a: `Los dos cortan y subtitulan igual de bien. Los premium (${premiumPrice}) agregan animaciones: las palabras se iluminan cuando las decís y las cajitas entran con rebote. También se usan para copiar el estilo de un reel de referencia.` },
  { q: "¿Y si no me gusta cómo quedó?", a: `Pedís cambios escribiendo qué ajustar y lo volvemos a editar por ${iterationPrice}. Si la edición falla, te devolvemos los créditos automáticamente.` },
  { q: "¿Puedo copiar el estilo de otro reel?", a: "Sí. Subís el reel (o una captura) como referencia, elegís qué copiar —subtítulos, animación, ritmo— y queda guardado como tu estilo para los próximos videos." },
  { q: "¿Puedo poner música?", a: "Sí. Subís el tema a tu carpeta, elegís el volumen y la música baja sola cuando hablás. Usá música sin copyright para que Instagram o TikTok no silencien el video." },
  { q: "¿Qué videos puedo subir?", a: "Videos de hasta 5 minutos y 1 GB, en MP4 o MOV. Funciona mejor cuando hablás a cámara o explicás lo que hacés." },
  { q: "¿Cómo pago?", a: "Con Mercado Pago: tarjeta de crédito, débito, dinero en cuenta o efectivo. Comprás créditos y los usás cuando quieras; no vencen y no hay suscripción." },
  { q: "¿Mis videos son privados?", a: "Sí. Solo vos ves tus videos y tus recursos. Los crudos se borran solos a los 30 días y los reels editados a los 90: descargalos cuando estén listos." },
];

// Recalcula la página cada hora (por si cambiás precios o estilos).
export const revalidate = 3600;

function PhoneMock({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <div className="mock">
      <div className="mock-phone">
        {children}
        <div className="mock-caption">{caption}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const premiumStyles = STYLES.filter(isPremium);
  const normalStyles = STYLES.filter((s) => !isPremium(s));

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand />
          <div className="spacer" />
          <a href="#como-funciona" className="btn btn-ghost hide-sm">
            Cómo funciona
          </a>
          <a href="#precios" className="btn btn-ghost hide-sm">
            Precios
          </a>
          <Link href="/login" className="btn btn-ghost">
            Entrar
          </Link>
          <Link href="/login" className="btn btn-primary hide-sm">
            Probar gratis
          </Link>
        </div>
      </header>

      <main>
        <section className="hero container hero-split">
          <div className="hero-copy">
            <span className="pill pill-accent">Para técnicos de celulares</span>
            <h1 style={{ marginTop: 18 }}>
              Grabá la reparación.
              <br />
              <span>Nosotros la editamos.</span>
            </h1>
            <p className="muted">
              Subís el video como sale del celular y te lo devolvemos cortado, con subtítulos, tus fotos de antes y después y el
              precio en pantalla. Sin aprender a editar y sin pagarle a un editor.
            </p>
            <div className="row hero-ctas">
              <Link href="/login" className="btn btn-primary">
                Editar mi primer video gratis
              </Link>
              <a href="#precios" className="btn">
                Ver precios
              </a>
            </div>
            <div className="hero-trust muted small">
              <span>✓ Primera edición gratis</span>
              <span>✓ Pagás con Mercado Pago</span>
              <span>✓ Sin suscripción</span>
            </div>
          </div>

          <div className="before-after" aria-hidden="true">
            <div className="ba-col">
              <div className="ba-label">Tu crudo</div>
              <div className="mock-phone ba-raw">
                <span className="ba-chip" style={{ top: "22%", left: "12%" }}>eh…</span>
                <span className="ba-chip" style={{ top: "40%", right: "10%" }}>silencio</span>
                <span className="ba-chip" style={{ top: "58%", left: "18%" }}>me trabé</span>
                <span className="ba-chip" style={{ top: "74%", right: "16%" }}>repetido</span>
              </div>
            </div>
            <div className="ba-arrow">→</div>
            <div className="ba-col">
              <div className="ba-label ba-label-accent">Editado</div>
              <div className="mock-phone">
                <div className="mock-question" style={{ top: "10%" }}>
                  <div className="mock-question-head">ME PREGUNTARON</div>
                  <div className="mock-question-body">¿Cuánto sale la batería de un iPhone 12?</div>
                </div>
                <div className="mock-caption">
                  TE LO <span style={{ color: "#FFD400" }}>EXPLICO</span> RÁPIDO
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section container">
          <h2>¿Te suena?</h2>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            {pains.map((p) => (
              <div key={p.title} className="card">
                <h3>{p.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section container">
          <div className="card highlight-card">
            <h2>Lo que hacemos con tu crudo</h2>
            <ul className="checklist">
              {whatWeDo.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section container" id="como-funciona">
          <h2>Así de simple</h2>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            {steps.map((s) => (
              <div key={s.n} className="card">
                <div className="icon-circle" style={{ margin: "0 0 12px" }}>
                  {s.n}
                </div>
                <h3>{s.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section container">
          <h2>Pensado para lo que grabás en el taller</h2>
          <p className="muted">Elegís qué tipo de video es y la edición se arma para ese formato.</p>
          <div className="grid grid-4" style={{ marginTop: 16 }}>
            {FORMATS.map((f) => (
              <div key={f.id} className="card">
                <h3>{f.name}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section container">
          <h2>Carteles listos, incluidos en el precio</h2>
          <p className="muted">Escribís el texto y aparecen solos en el momento justo del video.</p>
          <div className="mock-row">
            <PhoneMock caption="ME PREGUNTAN MUCHO ESTO">
              <div className="mock-question">
                <div className="mock-question-head">ME PREGUNTARON</div>
                <div className="mock-question-body">¿Conviene cambiar el módulo o comprar otro celular?</div>
              </div>
            </PhoneMock>
            <PhoneMock caption="TE CUENTO CUÁNTO SALE">
              <div className="mock-price">
                <div>Cambio de módulo iPhone 13</div>
                <b>$85.000</b>
              </div>
            </PhoneMock>
            <PhoneMock caption="ASÍ LLEGÓ EL EQUIPO">
              <div className="mock-tag">ANTES</div>
            </PhoneMock>
            <PhoneMock caption="SI TE PASA ESTO">
              <div className="mock-cta">
                <b>Escribime por WhatsApp</b>
                <span>Link en mi perfil</span>
              </div>
            </PhoneMock>
          </div>
          <p className="muted small" style={{ marginTop: 12 }}>
            Responder comentario · Cajita de preguntas · Precio o presupuesto · Etiquetas (antes, después, paso 1) · Título gancho ·
            Llamado a la acción
          </p>
        </section>

        <section className="section container">
          <h2>Elegí el estilo</h2>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            {normalStyles.map((s) => (
              <div key={s.id} className="card">
                <span className="pill">{s.tagline}</span>
                <h3 style={{ marginTop: 10 }}>{s.name}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
          <div className="card premium-card" style={{ marginTop: 20 }}>
            <div className="row">
              <h3 style={{ margin: 0 }}>★ Estilos premium</h3>
              <span className="pill pill-accent">{premiumPrice} por video</span>
            </div>
            <p className="muted">
              Animaciones como las de los creadores grandes: las palabras se iluminan cuando las decís y las cajitas entran con
              rebote. Y si viste un reel que te encanta, subilo como referencia y copiamos sus subtítulos, la fuente y el ritmo.
            </p>
            <div className="grid grid-4">
              {premiumStyles.map((s) => (
                <div key={s.id} className="card" style={{ background: "var(--surface-2)" }}>
                  <b>{s.name}</b>
                  <p className="muted small" style={{ margin: "6px 0 0" }}>
                    {s.description}
                  </p>
                </div>
              ))}
              <div className="card" style={{ background: "var(--surface-2)", borderStyle: "dashed" }}>
                <b>Tu referencia</b>
                <p className="muted small" style={{ margin: "6px 0 0" }}>
                  Subí un reel que te guste y elegí qué copiar: subtítulos, animación o ritmo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section container">
          <div className="grid grid-3">
            <div className="card">
              <h3>Tu carpeta en la nube</h3>
              <p className="muted" style={{ margin: 0 }}>
                Subí una vez tu logo, fotos de reparaciones y música. Quedan guardadas y las sumás a cualquier video con un toque.
              </p>
            </div>
            <div className="card">
              <h3>Cajitas de comentarios gratis</h3>
              <p className="muted" style={{ margin: 0 }}>
                Armá la burbuja de «responder comentario» o la cajita de preguntas y bajala en PNG. Sin pagar otra app.
              </p>
            </div>
            <div className="card">
              <h3>Subtítulos que se leen</h3>
              <p className="muted" style={{ margin: 0 }}>
                Grandes, con las palabras clave destacadas. La mayoría mira los reels sin sonido.
              </p>
            </div>
          </div>
        </section>

        <section className="section container">
          <h2>Editar vos, pagarle a un editor o Edición Simple</h2>
          <div className="compare">
            <div className="compare-row compare-head">
              <div />
              <div>Editar vos</div>
              <div>Un editor</div>
              <div className="compare-us">Edición Simple</div>
            </div>
            {comparison.map((c) => (
              <div key={c.label} className="compare-row">
                <div className="compare-label">{c.label}</div>
                <div className="muted" data-label="Editar vos">
                  {c.you}
                </div>
                <div className="muted" data-label="Un editor">
                  {c.editor}
                </div>
                <div className="compare-us" data-label="Edición Simple">
                  {c.us}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section container" id="precios">
          <h2>Un precio simple: {editPrice} por video</h2>
          <p className="muted">
            Estilos premium: {premiumPrice}. ¿Querés ajustar algo? Pedís cambios por {iterationPrice}: con un estilo normal pagás
            como mucho {maxPrice} con una ronda de cambios. Si comprás más videos juntos, te sale más barato cada uno.
          </p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {PACKS.map((p) => (
              <div key={p.id} className={`card stack ${p.highlight ? "selectable selected" : ""}`}>
                <div className="row">
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  {p.highlight && <span className="pill pill-accent">Más elegido</span>}
                </div>
                <div className="price">{formatArs(p.priceArs)}</div>
                <div className="muted">
                  {formatArs(pricePerVideo(p))} por video · {p.credits} créditos
                </div>
                <Link href="/login" className={`btn ${p.highlight ? "btn-primary" : ""}`} style={{ width: "100%" }}>
                  Empezar
                </Link>
              </div>
            ))}
          </div>
          <div className="guarantee">
            <b>Sin riesgo:</b> tu primera edición es gratis, los créditos no vencen y si una edición falla te los devolvemos
            automáticamente.
          </div>
        </section>

        <section className="section container">
          <h2>Preguntas frecuentes</h2>
          <div className="stack" style={{ marginTop: 16 }}>
            {faqs.map((f) => (
              <details key={f.q} className="card faq">
                <summary>{f.q}</summary>
                <p className="muted" style={{ marginBottom: 0 }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="section container final-cta">
          <h2>Tu próximo reel, editado en minutos</h2>
          <p className="muted">Probalo con un video que tengas en la galería. La primera edición corre por nuestra cuenta.</p>
          <Link href="/login" className="btn btn-primary">
            Editar mi primer video gratis
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
