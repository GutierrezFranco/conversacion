import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { AppTabs } from "@/components/AppTabs";
import { Brand } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { isAdmin } from "@/lib/admin";
import { getBalance } from "@/lib/api";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const balance = await getBalance(user.id);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand href="/app" />
          <div className="spacer" />
          <Link href="/app/creditos" className="credits-pill" title="Tus créditos">
            <Icon name="coin" size={18} />
            <b>{balance}</b>
            <span className="hide-sm">créditos</span>
          </Link>
          <AccountMenu email={user.email ?? ""} isAdmin={isAdmin(user.email)} />
        </div>
      </header>
      <div className="container">
        <AppTabs />
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
