import { LogoSymbol } from "@/components/brand/Logo";

export function NotConfigured() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <LogoSymbol className="h-14 w-14" />
      <h1 className="mt-6 font-serif text-4xl font-light">Administration non configurée</h1>
      <p className="mt-4 text-brun/75">
        L’administration s’appuie sur Supabase (authentification, base PostgreSQL, stockage). Tant
        que les variables d’environnement ne sont pas renseignées, aucun accès n’est possible et le
        site public tourne sur le catalogue de démonstration.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-brun/80">
        <li>
          Créer un projet Supabase (offre gratuite) et appliquer les migrations de{" "}
          <code>supabase/migrations</code>.
        </li>
        <li>
          Renseigner <code>NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> et <code>SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          (serveur uniquement).
        </li>
        <li>
          Créer le premier super administrateur :{" "}
          <code>npm run admin:init -- email@domaine.fr</code> (voir <code>docs/SECURITE.md</code>).
        </li>
      </ol>
    </main>
  );
}
