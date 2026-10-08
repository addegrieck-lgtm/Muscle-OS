import Link from "next/link";
import { headers } from "next/headers";

const NAV = [
  ["/", "Tableau de bord"], ["/players", "Joueurs"], ["/server", "Serveur"], ["/commands", "Commandes MC"],
  ["/world", "Monde"], ["/shop", "Boutique"], ["/news", "News"], ["/events", "Événements"], ["/faq", "FAQ"],
  ["/marketing", "Marketing"], ["/costs", "Coûts"], ["/team", "Équipe"],
] as const;

/** Identité de l'admin connecté (posée par le middleware après vérification de la session). */
export async function currentAdmin() {
  const h = await headers();
  return { name: decodeURIComponent(h.get("x-admin-name") ?? "Admin"), role: h.get("x-admin-role") ?? "admin" };
}

export async function Shell({ children }: { children: React.ReactNode }) {
  const me = await currentAdmin();
  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-line bg-surface md:border-b-0 md:border-r">
        <p className="flex items-center gap-2 px-5 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/admin/brand/valoria-symbole.svg" alt="" width={28} height={28} className="size-7" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/admin/brand/valoria-wordmark-argent.svg" alt="VÆLORIA" width={96} height={16} className="h-3.5 w-auto" />
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Admin</span>
        </p>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-fg">{label}</Link>
          ))}
        </nav>
        <div className="hidden border-t border-line px-5 py-4 text-xs text-muted md:block">
          <p className="truncate font-semibold text-fg">{me.name}</p>
          <p>{me.role === "owner" ? "Propriétaire" : "Administrateur"}</p>
          <div className="mt-2 flex gap-3">
            <a href={`${site}/`} className="hover:text-fg">Voir le site</a>
            <form action={`${site}/api/auth/logout`} method="post"><button className="hover:text-fg">Déconnexion</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">{children}</main>
    </div>
  );
}

export function H1({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-2xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">API : {message}</p>;
}
