import Link from "next/link";
import { Brand } from "@/components/Brand";
import { CREDIT_PRICE_ARS, EDIT_CREDITS, ITERATION_CREDITS, PACKS, formatArs, pricePerVideo } from "@/lib/pricing";
import { STYLES } from "@/lib/styles";

const editPrice = formatArs(EDIT_CREDITS * CREDIT_PRICE_ARS);
const iterationPrice = formatArs(ITERATION_CREDITS * CREDIT_PRICE_ARS);
const maxPrice = formatArs((EDIT_CREDITS + ITERATION_CREDITS) * CREDIT_PRICE_ARS);

const pains = [
  { title: "Grabás, pero no publicás", text: "El video de la reparación queda en la galería porque no tenés tiempo de sentarte a editarlo." },
  { title: "Editar te come el día", text: "Cortar, poner subtítulos y acomodar fotos te lleva una hora por reel. Esa hora es de taller." },
  { title: "Un editor no te cierra", text: "Para la cantidad de videos que querés subir, pagarle a alguien todos los meses sale caro." },
];

const steps = [
  { n: "1", title: "Subí tu crudo", text: "Tal cual lo grabaste con el celular, con errores, silencios y todo." },
  { n: "2", title: "Elegí estilo y carteles", text: "Sumá tus fotos de antes y después, el precio o una cajita de preguntas." },
  { n: "3", title: "Descargalo y publicalo", text: "En minutos lo tenés cortado y con subtítulos. ¿Algo no te gusta? Pedí cambios." },
];

const faqs = [
  { q: "¿Necesito saber editar?", a: "No. Subís el video, elegís un estilo y listo. Si querés, le escribís indicaciones como se las darías a un editor: «sacá la parte donde me trabo»." },
  { q: "¿Cuánto tarda?", a: "Normalmente entre 2 y 6 minutos. Podés cerrar la página y volver después: queda guardado en «Tus reels»." },
  { q: "¿Y si no me gusta cómo quedó?", a: `Pedís cambios escribiendo qué ajustar y lo volvemos a editar por ${iterationPrice}. Si la edición falla, te devolvemos los créditos.` },
  { q: "¿Qué videos puedo subir?", a: "Videos verticales u horizontales de hasta 5 minutos y 1 GB, en MP4 o MOV. Funciona mejor cuando hablás a cámara o explicás lo que hacés." },
  { q: "¿Cómo pago?", a: "Con Mercado Pago: tarjeta de crédito, débito, dinero en cuenta o efectivo. Comprás créditos y los usás cuando quieras; no vencen." },
  { q: "¿Mis videos son privados?", a: "Sí. Solo vos ves tus videos y tus recursos. Los crudos se borran solos a los 30 días." },
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
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand />
          <div className="spacer" />
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
        <section className="hero container">
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
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary">
              Editar mi primer video gratis
            </Link>
            <a href="#precios" className="btn">
              Ver precios
            </a>
          </div>
          <p className="muted small">Tu primera edición es gratis. Después, {editPrice} por video.</p>
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
          <h2>Carteles pensados para tu taller</h2>
          <p className="muted">
            Escribís el texto y aparecen solos en el momento justo del video. Están incluidos en el precio.
          </p>
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
            Cajita de preguntas · Precio o presupuesto · Etiquetas (antes, después, paso 1) · Título gancho · Llamado a la acción
          </p>
        </section>

        <section className="section container">
          <div className="grid grid-3">
            <div className="card">
              <h3>Tu carpeta en la nube</h3>
              <p className="muted" style={{ margin: 0 }}>
                Subí una vez tu logo, capturas y fotos de reparaciones. Quedan guardadas y las sumás a cualquier video con un toque.
              </p>
            </div>
            <div className="card">
              <h3>Cortes que se entienden</h3>
              <p className="muted" style={{ margin: 0 }}>
                Sacamos errores, muletillas, frases repetidas y silencios, sin cortar la explicación a la mitad.
              </p>
            </div>
            <div className="card">
              <h3>Copiá el estilo que te gusta</h3>
              <p className="muted" style={{ margin: 0 }}>
                ¿Viste un reel con subtítulos que te encantan? Subilo como referencia y copiamos la fuente, los colores y el ritmo.
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
          <h2>Elegí el estilo</h2>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            {STYLES.map((s) => (
              <div key={s.id} className="card">
                <span className="pill">{s.tagline}</span>
                <h3 style={{ marginTop: 10 }}>{s.name}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="section container" id="precios">
          <h2>Un precio simple: {editPrice} por video</h2>
          <p className="muted">
            ¿Querés ajustar algo? Pedís cambios por {iterationPrice}. Como mucho pagás {maxPrice} por un video con una ronda de
            cambios. Si comprás más videos juntos, te sale más barato cada uno.
          </p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {PACKS.map((p) => (
              <div key={p.id} className={`card stack ${p.highlight ? "selectable selected" : ""}`}>
                <div className="row">
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  {p.highlight && <span className="pill pill-accent">Más elegido</span>}
                </div>
                <div className="price">{formatArs(p.priceArs)}</div>
                <div className="muted">{formatArs(pricePerVideo(p))} por video</div>
                <Link href="/login" className={`btn ${p.highlight ? "btn-primary" : ""}`} style={{ width: "100%" }}>
                  Empezar
                </Link>
              </div>
            ))}
          </div>
          <p className="muted small">Pagás con Mercado Pago. Los créditos no vencen. Tu primera edición es gratis.</p>
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

        <section className="section container" style={{ textAlign: "center" }}>
          <h2>Tu próximo reel, editado en minutos</h2>
          <p className="muted">Probalo con un video que tengas en la galería. La primera edición corre por nuestra cuenta.</p>
          <Link href="/login" className="btn btn-primary">
            Editar mi primer video gratis
          </Link>
        </section>
      </main>

      <footer className="footer">
        <div className="container row">
          <Brand />
          <div className="spacer" />
          <span className="muted small">© {new Date().getFullYear()} Edición Simple</span>
        </div>
      </footer>
    </>
  );
}
