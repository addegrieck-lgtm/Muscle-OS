import Link from "next/link";
import type { ShopCatalog } from "@vaeloria/types";
import { Container, Eyebrow, buttonClass, cn } from "@vaeloria/ui";
import { MyProgress } from "./MyProgress";

/** En-tête commun de la boutique : titre, progression, navigation par catégorie, promotions. */
export function ShopShell({ catalog, active, children }: { catalog: ShopCatalog | null; active: string | null; children: React.ReactNode }) {
  const live = catalog?.promotions.filter((p) => p.label) ?? [];
  return (
    <>
      <div className="page-backdrop border-b border-line/60">
        <Container className="py-10 sm:py-14">
          <Eyebrow>Boutique</Eyebrow>
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em] sm:text-5xl">La boutique VÆLORIA</h1>
          <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-muted sm:text-base">
            Équipe-toi. Progresse. <span className="text-accent">Conquiers.</span>
          </p>
          {catalog && (
            <div className="mt-8">
              <MyProgress ranks={catalog.ranks} next={active ? `/boutique/${active}` : "/boutique"} />
            </div>
          )}
        </Container>
      </div>
      {live.length > 0 && (
        <div className="border-b border-ruby/30 bg-ruby/10">
          <Container className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
            {live.map((p) => (
              <span key={p.id} className="font-display font-semibold uppercase tracking-[0.12em] text-accent">
                {p.label}
                {p.endsAt && <span className="ml-2 font-sans normal-case tracking-normal text-muted">jusqu&apos;au {new Date(p.endsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}</span>}
              </span>
            ))}
          </Container>
        </div>
      )}
      <nav aria-label="Catégories de la boutique" className="sticky top-16 z-20 border-b border-line/60 bg-bg/90 backdrop-blur">
        <Container className="-mb-px flex gap-1 overflow-x-auto py-2">
          <Link href="/boutique" aria-current={active === null ? "page" : undefined} className={cn(buttonClass(active === null ? "primary" : "ghost", "sm"), "shrink-0")}>Tout</Link>
          {catalog?.categories.map((c) => (
            <Link key={c.slug} href={`/boutique/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={cn(buttonClass(active === c.slug ? "primary" : "ghost", "sm"), "shrink-0")}>
              {c.name}
            </Link>
          ))}
        </Container>
      </nav>
      {children}
      <Reassurance />
    </>
  );
}

function Reassurance() {
  const items = [
    ["Livraison automatique", "Ton achat arrive en jeu, même si tu es hors ligne au moment du paiement."],
    ["Paiement sécurisé", "Le paiement se fait chez notre prestataire : VÆLORIA ne voit jamais tes données bancaires."],
    ["1 € = 1 point", "Chaque achat te rapproche du prochain grade, débloqué automatiquement."],
    ["Pas de pay-to-win extrême", "Équipement vanilla : le skill reste décisif en PvP."],
  ];
  return (
    <Container className="grid gap-3 py-12 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([t, d]) => (
        <div key={t} className="rounded-[var(--radius-card)] border border-line p-4">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.08em]">{t}</p>
          <p className="mt-1 text-sm text-muted">{d}</p>
        </div>
      ))}
    </Container>
  );
}
