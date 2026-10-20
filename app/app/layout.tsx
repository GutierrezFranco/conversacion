import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/Brand";
import { AppTabs } from "@/components/AppTabs";
import { getBalance } from "@/lib/api";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const balance = await getBalance(user.id);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand href="/app" />
          <div className="spacer" />
          <Link href="/app/creditos" className="btn">
            <span style={{ color: "var(--accent-2)" }}>●</span> {balance} créditos
          </Link>
          <form action="/auth/signout" method="post" className="hide-sm">
            <button className="btn btn-ghost">Salir</button>
          </form>
        </div>
      </header>
      <div className="container">
        <AppTabs />
        <main style={{ padding: "20px 0 60px" }}>{children}</main>
      </div>
    </>
  );
}
