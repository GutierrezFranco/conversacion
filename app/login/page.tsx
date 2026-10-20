"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/browser";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(params.get("error") ? "No pudimos hacerte entrar: el link venció o hubo un problema con Google. Probá de nuevo." : "");
  const [loading, setLoading] = useState(false);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setLoading(false);
    if (error) setError("No pudimos mandar el mail. Revisá la dirección y probá de nuevo.");
    else setSent(true);
  }

  async function google() {
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  }

  return (
    <div className="stack" style={{ width: "100%", maxWidth: 400 }}>
      <Brand />
      {sent ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Revisá tu mail</h2>
          <p className="muted" style={{ margin: 0 }}>
            Te mandamos un link a <b style={{ color: "var(--text)" }}>{email}</b>. Abrilo desde este mismo dispositivo para entrar. Si no
            lo ves, fijate en spam o promociones.
          </p>
          <button className="btn btn-ghost" onClick={() => setSent(false)}>
            Usar otro mail
          </button>
        </div>
      ) : (
        <>
          <div>
            <h1 style={{ fontSize: "1.9rem" }}>Entrá a tu cuenta</h1>
            <p className="muted" style={{ margin: 0 }}>
              ¿Es tu primera vez? Se crea sola y tu primera edición es gratis.
            </p>
          </div>
          <button className="btn" style={{ width: "100%" }} onClick={google}>
            <GoogleIcon /> Seguir con Google
          </button>
          <div className="divider">
            <span>o con tu mail</span>
          </div>
          <form onSubmit={sendLink} className="stack">
            <input type="email" required autoComplete="email" placeholder="tu@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Enviando…" : "Mandame el link para entrar"}
            </button>
          </form>
          {error && <div className="alert">{error}</div>}
          <p className="muted small" style={{ margin: 0 }}>
            Al entrar aceptás los <Link href="/terminos">términos</Link> y la <Link href="/privacidad">política de privacidad</Link>.
          </p>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <aside className="auth-side" aria-hidden="true">
        <div className="stack" style={{ maxWidth: 380 }}>
          <div className="mock-phone" style={{ width: 260, margin: "0 auto" }}>
            <div className="mock-question" style={{ top: "12%" }}>
              <div className="mock-question-head">ME PREGUNTARON</div>
              <div className="mock-question-body">¿Conviene cambiar el módulo o comprar otro celular?</div>
            </div>
            <div className="mock-caption">
              TE LO <span style={{ color: "#FFD400" }}>EXPLICO</span> RÁPIDO
            </div>
          </div>
          <h2 style={{ textAlign: "center", marginTop: 24 }}>Grabá la reparación. Nosotros la editamos.</h2>
          <p className="muted" style={{ textAlign: "center", margin: 0 }}>
            Cortes, subtítulos, tus fotos y carteles en minutos.
          </p>
        </div>
      </aside>
      <section className="auth-form">
        <Suspense>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
