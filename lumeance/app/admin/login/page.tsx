import { redirect } from "next/navigation";
import { LogoSymbol, Wordmark } from "@/components/brand/Logo";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { getAdminSession } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (!isSupabaseConfigured()) return <NotConfigured />;
  if (await getAdminSession()) redirect("/admin/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center">
          <LogoSymbol className="h-16 w-16" />
          <Wordmark className="mt-4 h-4 w-auto" />
          <p className="mt-3 text-[0.7rem] uppercase tracking-[0.25em] text-brun/50">
            Administration
          </p>
        </div>
        <LoginForm />
        <p className="mt-8 text-center text-xs text-brun/45">
          Accès réservé. Aucune inscription publique.
        </p>
      </div>
    </main>
  );
}
