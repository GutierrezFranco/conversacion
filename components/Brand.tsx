import Link from "next/link";
import { Logo } from "./Logo";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="Edición Simple, inicio">
      <Logo />
      <span>
        Edición<span className="brand-light"> Simple</span>
      </span>
    </Link>
  );
}
