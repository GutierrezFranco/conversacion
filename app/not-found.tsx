import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16, textAlign: "center" }}>
      <div className="stack" style={{ maxWidth: 420 }}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <Logo size={56} />
        </div>
        <h1>No encontramos esta página</h1>
        <p className="muted">Puede que el link esté mal escrito o que el contenido ya no exista.</p>
        <div>
          <Link href="/app" className="btn btn-primary">
            Ir a mis reels
          </Link>
        </div>
      </div>
    </main>
  );
}
