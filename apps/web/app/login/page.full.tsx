import { redirect } from "next/navigation";
import { Card, Container, Section, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { devLogin } from "@/lib/shop/actions.full";
import { pageMeta } from "@/lib/seo";
import { getMe, safeNext } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Connexion", description: "Connexion au compte VÆLORIA.", path: "/login", noindex: true });

const ERRORS: Record<string, string> = {
  discord: "La connexion Discord a échoué ou n'est pas encore configurée. Réessaie.",
  etat: "La connexion a expiré. Réessaie.",
  dev: "Connexion de développement refusée.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erreur?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getMe().catch(() => null)) redirect(next);
  return (
    <>
      <PageHeader title="Connexion" eyebrow="Compte VÆLORIA" crumbs={[{ name: "Connexion", path: "/login" }]} description="Un seul clic avec Discord, sans mot de passe à retenir." />
      <Section>
        <Container className="max-w-md">
          <Card className="space-y-4">
            {sp.erreur && ERRORS[sp.erreur] && <p role="alert" className="text-sm text-danger">{ERRORS[sp.erreur]}</p>}
            {/* Lien simple (pas de préchargement Next) : la route OAuth redirige vers Discord. */}
            <a href={`/api/auth/discord?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "lg", "w-full")}>Se connecter avec Discord</a>
            <p className="text-sm text-muted">Ensuite, lie ton compte Minecraft avec la commande <code className="rounded bg-surface-2 px-1 text-fg">/link</code> en jeu pour suivre tes points et tes grades.</p>
            {process.env.DEV_LOGIN === "1" && (
              <form action={devLogin} className="space-y-2 border-t border-dashed border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-warning">Développement uniquement</p>
                <input type="hidden" name="next" value={next} />
                <div className="flex gap-2">
                  <input name="name" required pattern="[A-Za-z0-9_]{3,16}" placeholder="Pseudo de test" aria-label="Pseudo de test" className="h-10 flex-1 rounded-lg border border-line bg-surface-2 px-3 text-fg" />
                  <button className="rounded-md border border-line px-3 text-sm font-semibold">Entrer</button>
                </div>
              </form>
            )}
          </Card>
        </Container>
      </Section>
    </>
  );
}
