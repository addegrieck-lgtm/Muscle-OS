import Link from "next/link";
import { BRAND } from "@vaeloria/config";
import { Badge, ButtonLink, Card, Container, EmptyState, Section, SectionHeader, StatCard, Table, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { VOTE, VOTE_SITES, dailyPot, formatCooldown, wheelOdds } from "@/content/gameplay";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;

export const metadata = pageMeta({
  title: "Voter pour VÆLORIA — récompenses et roue du jour",
  description: `Vote pour ${BRAND.name} sur 3 sites : ${VOTE.perVote.money} $ par vote, bonus de fidélité et roue du jour jusqu'à ×4. Classement des meilleurs votants du mois.`,
  path: "/voter",
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y && m ? `${MONTHS[m - 1]} ${y}` : "ce mois-ci";
};

const STEPS = [
  { title: "Vote sur les 3 sites", body: `Chaque vote remplit ta cagnotte du jour : ${money(VOTE.perVote.money)} et des objets.` },
  { title: "Bonus de fidélité", body: `Au 3e site, +${money(VOTE.allSitesBonus.money)} et la roue du jour se débloque.` },
  { title: "Lance la roue", body: "En jeu, /roue : classique (jamais de perte) ou quitte ou double." },
  { title: "Reviens demain", body: `Un rappel cliquable toutes les ${VOTE.reminderMinutes} minutes tant qu'un site est votable.` },
];

export default async function VotePage() {
  const votes = await orNull(api.votes());
  const classic = wheelOdds(VOTE.wheel.classic);
  const risky = wheelOdds(VOTE.wheel.risky);
  const pot = dailyPot();

  return (
    <>
      <PageHeader
        eyebrow="Voter"
        title="Vote, gagne, fais grandir le serveur"
        description={`3 sites, environ 2 minutes par jour. Chaque vote rapporte en jeu et fait monter ${BRAND.name} dans les classements de serveurs.`}
        crumbs={[{ name: "Voter", path: "/voter" }]}
      />

      {/* Les 3 sites */}
      <Section>
        <Container>
          <SectionHeader eyebrow="Étape 1" title="Les 3 sites de vote" description="Utilise ton pseudo Minecraft exact. Ton vote arrive en jeu en quelques secondes ; sinon, tape /vote verifier." />
          <ol className="grid gap-3 md:grid-cols-3">
            {VOTE_SITES.map((s, i) => (
              <li key={s.id}>
                <Card className="flex h-full flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-bold text-accent">Site {i + 1}</p>
                    <Badge>Toutes les {formatCooldown(s.cooldownMinutes)}</Badge>
                  </div>
                  <p className="mt-2 font-display text-xl font-bold uppercase tracking-[0.04em]">{s.name}</p>
                  <p className="mt-1 text-sm text-muted">+{money(VOTE.perVote.money)} · {VOTE.perVote.items.map(([n, q]) => `${q} ${n.toLowerCase()}`).join(" · ")}</p>
                  <div className="mt-auto pt-5">
                    {s.url ? (
                      <ButtonLink href={s.url} external className="w-full" data-track="vote_click" data-track-id={s.id}>Voter sur {s.name}</ButtonLink>
                    ) : (
                      <span className={buttonClass("secondary", "md", "w-full cursor-not-allowed opacity-60")} aria-disabled>Lien bientôt disponible</span>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">En jeu, <code className="text-fg">/vote</code> ouvre les mêmes liens et montre les sites encore votables aujourd&apos;hui.</p>
        </Container>
      </Section>

      {/* Déroulé */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Le déroulé" title="Une journée de votes" />
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Card className="h-full">
                  <p className="font-display text-sm font-bold text-accent">{String(i + 1).padStart(2, "0")}</p>
                  <p className="mt-1 font-semibold">{s.title}</p>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* Récompenses + roue */}
      <Section className="border-t border-line/60">
        <Container className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="Récompenses" title="Ta cagnotte du jour" />
            <Table head={["", "Argent", "Objets"]}>
              <tr>
                <td className="font-semibold">Par site voté</td>
                <td className="tabular-nums">{money(VOTE.perVote.money)}</td>
                <td className="text-muted">{VOTE.perVote.items.map(([n, q]) => `${q} × ${n}`).join(", ")}</td>
              </tr>
              <tr>
                <td className="font-semibold">Bonus 3 sites</td>
                <td className="tabular-nums">{money(VOTE.allSitesBonus.money)}</td>
                <td className="text-muted">{VOTE.allSitesBonus.items.map(([n, q]) => `${q} × ${n}`).join(", ")}</td>
              </tr>
              <tr>
                <td className="font-semibold">Journée complète</td>
                <td className="font-bold tabular-nums text-accent">{money(pot)}</td>
                <td className="text-muted">avant la roue</td>
              </tr>
            </Table>
            <p className="mt-4 text-sm text-muted">
              Cagnotte jamais lancée ? Elle t&apos;est versée ×1 au changement de jour (minuit, heure de Paris) : tu ne perds rien en oubliant la roue.
              Gains de vote plafonnés à {money(VOTE.maxMoneyPerDay)} par jour.
            </p>
          </div>
          <div>
            <SectionHeader eyebrow="Roue du jour" title="Tente ta chance" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Classique", cmd: "/roue classique", odds: classic, note: "Jamais de perte" },
                { title: "Quitte ou double", cmd: "/roue risque", odds: risky, note: "Tout ou rien" },
              ].map((w) => (
                <Card key={w.title} className="h-full">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display font-bold uppercase tracking-[0.05em]">{w.title}</p>
                    <Badge tone={w.title === "Classique" ? "success" : "danger"}>{w.note}</Badge>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {w.odds.rows.map((r) => (
                      <li key={r.multiplier} className="flex items-center justify-between gap-3">
                        <span className={r.multiplier === 0 ? "text-danger" : "font-semibold"}>{r.multiplier === 0 ? "Rien" : `×${r.multiplier}`}</span>
                        <span className="text-muted tabular-nums">{String(r.percent).replace(".", ",")} %</span>
                        <span className="w-24 text-right tabular-nums">{money(pot * r.multiplier)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-line/60 pt-3 text-xs text-subtle">Moyenne ×{String(w.odds.average).replace(".", ",")} · <code>{w.cmd}</code></p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      {/* Classement des votants */}
      <Section className="border-t border-line/60">
        <Container className="grid gap-10 lg:grid-cols-[320px_1fr] [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="Communauté" title={`Votes de ${votes ? monthLabel(votes.month) : "ce mois-ci"}`} />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <StatCard label="Votes ce mois" value={votes ? fmt(votes.total) : "—"} />
              <StatCard label="Votes aujourd'hui" value={votes ? fmt(votes.today) : "—"} />
              <StatCard label="Votants ce mois" value={votes ? fmt(votes.voters) : "—"} className="col-span-2 lg:col-span-1" />
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="Classement" title="Meilleurs votants" description="Remis à zéro le 1er de chaque mois." />
            {votes?.top.length ? (
              <Table head={["#", "Joueur", "Votes"]}>
                {votes.top.map((v) => (
                  <tr key={v.uuid}>
                    <td className="w-10 font-bold tabular-nums text-accent">{v.rank}</td>
                    <td><Link href={`/joueur/${encodeURIComponent(v.username)}`} className="font-semibold hover:text-accent">{v.username}</Link></td>
                    <td className="text-right font-semibold tabular-nums">{fmt(v.votes)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="Aucun vote enregistré ce mois-ci">Le premier nom du classement peut être le tien.</EmptyState>
            )}
          </div>
        </Container>
      </Section>
    </>
  );
}
