import Link from "next/link";
import { Brand } from "@/components/Brand";
import { EDIT_CREDITS, ITERATION_CREDITS, PACKS, SIGNUP_BONUS_CREDITS, packPriceArs } from "@/lib/pricing";
import { STYLES } from "@/lib/styles";

const steps = [
  { n: "1", title: "Subí tu crudo", text: "El video tal cual lo grabaste con el celular. Con errores, silencios y todo." },
  { n: "2", title: "Elegí un estilo", text: "Tech, Impacto, Storytelling… y sumá capturas o tu logo si querés que aparezcan." },
  { n: "3", title: "Descargá tu reel", text: "Cortado, con subtítulos y listo para subir. ¿Algo no te gusta? Pedí cambios." },
];

// Recalcula los precios en pesos cada hora (por si cambiás ARS_PER_USD).
export const revalidate = 3600;

export default function Landing() {
  const arsPerUsd = Number(process.env.ARS_PER_USD ?? 1450);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand />
          <div className="spacer" />
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
          <span className="pill pill-accent">Edición simple</span>
          <h1 style={{ marginTop: 18 }}>
            Tus reels editados,
            <br />
            <span>sin editar vos.</span>
          </h1>
          <p className="muted">
            Ni horas en CapCut, ni pagarle a un editor. Subís el video crudo, elegís un estilo y la IA lo corta, le pone
            subtítulos y mete tus recursos donde van.
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary">
              Editar mi primer reel gratis
            </Link>
          </div>
          <p className="muted small">
            Te regalamos {SIGNUP_BONUS_CREDITS} créditos al registrarte: alcanza para una edición completa.
          </p>
        </section>

        <section className="section container">
          <div className="grid grid-3">
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
          <h2>Estilos para cada tipo de contenido</h2>
          <p className="muted">Elegís uno y la edición sigue ese ritmo y esa estética de principio a fin.</p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
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
          <h2>Pagás solo lo que usás</h2>
          <p className="muted">
            Comprás créditos con Mercado Pago y los usás cuando quieras. Una edición cuesta {EDIT_CREDITS} créditos y
            pedir cambios sobre ella, {ITERATION_CREDITS}. También podés generar imágenes y videos con IA.
          </p>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {PACKS.map((p) => (
              <div key={p.id} className={`card ${p.highlight ? "selectable selected" : ""}`}>
                <div className="row">
                  <h3 style={{ margin: 0 }}>{p.name}</h3>
                  {p.highlight && <span className="pill pill-accent">Más elegido</span>}
                </div>
                <div className="price" style={{ marginTop: 10 }}>
                  ${packPriceArs(p, arsPerUsd).toLocaleString("es-AR")}
                </div>
                <p className="muted">
                  {p.credits} créditos · unas {Math.floor(p.credits / EDIT_CREDITS)} ediciones
                </p>
                <Link href="/login" className={`btn ${p.highlight ? "btn-primary" : ""}`} style={{ width: "100%" }}>
                  Empezar
                </Link>
              </div>
            ))}
          </div>
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
