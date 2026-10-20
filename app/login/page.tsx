"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(params.get("error") ? "El link venció o ya se usó. Pedí uno nuevo." : "");
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
    <div className="card stack" style={{ width: "100%", maxWidth: 420 }}>
      <Brand />
      {sent ? (
        <div className="alert alert-ok">
          Te mandamos un link a <b>{email}</b>. Abrilo desde este mismo dispositivo para entrar.
        </div>
      ) : (
        <>
          <div>
            <h2>Entrá o creá tu cuenta</h2>
            <p className="muted" style={{ margin: 0 }}>
              Sin contraseñas: te llega un link por mail.
            </p>
          </div>
          <form onSubmit={sendLink} className="stack">
            <input type="email" required placeholder="tu@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Enviando…" : "Mandame el link"}
            </button>
          </form>
          <button className="btn" style={{ width: "100%" }} onClick={google}>
            Seguir con Google
          </button>
          {error && <div className="alert">{error}</div>}
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
