"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export function AccountMenu({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="account" ref={ref}>
      <button className="avatar" onClick={() => setOpen((o) => !o)} aria-label="Tu cuenta" aria-expanded={open}>
        {email[0]?.toUpperCase() ?? "?"}
      </button>
      {open && (
        <div className="menu" role="menu" onClick={() => setOpen(false)}>
          <div className="menu-head">
            <div className="small muted">Conectado como</div>
            <div className="menu-email">{email}</div>
          </div>
          <Link href="/app/creditos" role="menuitem">
            <Icon name="coin" size={18} /> Créditos y compras
          </Link>
          <Link href="/app/recursos" role="menuitem">
            <Icon name="folder" size={18} /> Mis recursos
          </Link>
          {isAdmin && (
            <Link href="/app/admin" role="menuitem">
              <Icon name="shield" size={18} /> Administración
            </Link>
          )}
          <Link href="/contacto" role="menuitem">
            <Icon name="help" size={18} /> Ayuda
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem">
              <Icon name="logout" size={18} /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
