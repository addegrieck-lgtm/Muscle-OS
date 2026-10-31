import Link from "next/link";
import { LogoSymbol } from "@/components/brand/Logo";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin, ROLE_LABELS } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { signOut } from "../actions-auth";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) return <NotConfigured />;
  const session = await requireAdmin();
  return (
    <div className="lg:flex">
      <aside className="bg-noir text-ivoire lg:fixed lg:inset-y-0 lg:w-64">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <LogoSymbol className="h-9 w-9" />
            <span className="font-serif text-lg tracking-[0.25em]">LUMÉANCE</span>
          </Link>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ivoire/40 lg:mt-2">
            Administration
          </p>
        </div>
        <AdminNav role={session.role} />
        <div className="border-t border-ivoire/10 px-5 py-4 text-xs text-ivoire/60 lg:absolute lg:inset-x-0 lg:bottom-0">
          <p className="truncate">{session.email}</p>
          <p className="text-champagne">{ROLE_LABELS[session.role]}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/" className="hover:text-ivoire">
              Voir le site
            </Link>
            <form action={signOut}>
              <button type="submit" className="hover:text-ivoire">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 lg:ml-64 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
