import Link from "next/link";
import { Card, Table, buttonClass, formatNumber } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { adminApi } from "@/lib/api";

type Funnel = { days: number; steps: Record<string, number>; world?: Record<string, number> };
type Marketing = {
  sources: { source: string; visitors: number; copiedIp: number; discord: number }[];
  campaigns: { source: string; medium: string | null; campaign: string; content: string | null; visitors: number }[];
  referrers: { host: string; visitors: number }[];
};

const WORLD_STEPS: [string, string][] = [
  ["cta_click", "Clics « Rejoindre » / CTA"], ["register", "Inscription (Discord)"], ["founder_join", "Fondateur"], ["account_linked", "Compte Minecraft lié"],
  ["empire_create", "Empire fondé"], ["empire_join", "Empire rejoint"],
];
const WORLD_OTHER: [string, string][] = [
  ["referral_click", "Clics d'invitation"], ["referral_register", "Inscriptions parrainées"], ["vote", "Votes au Conseil"], ["share_empire", "Partages d'empire"],
  ["map_view", "Vues de la carte"], ["empire_view", "Vues d'empire"], ["server_vote_open", "Clics « Voter »"], ["server_vote", "Votes comptabilisés"], ["war_view", "Vues de guerre"], ["event_view", "Vues d'événement"], ["ranking_view", "Vues de classement"],
];

const STEPS: [string, string][] = [
  ["visitors", "Visiteurs"], ["copiedIp", "Copie de l'IP"], ["discord", "Clic Discord"], ["firstJoin", "Première connexion"],
  ["linkedAccounts", "Compte lié"], ["joinedFaction", "Première faction"], ["firstPvp", "Premier PvP"], ["returned", "Retour (J+1)"], ["recurring", "Joueur récurrent (J+7)"],
];

export default async function MarketingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = [7, 30, 90].includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  let f: Funnel, m: Marketing;
  try {
    [f, m] = await Promise.all([adminApi<Funnel>(`/funnel?days=${days}`), adminApi<Marketing>(`/marketing?days=${days}`)]);
  } catch (e) {
    return <><H1>Marketing</H1><ErrorBox message={(e as Error).message} /></>;
  }
  const top = Math.max(1, f.steps.visitors ?? 0);
  return (
    <>
      <H1 action={<div className="flex gap-2">{[7, 30, 90].map((d) => <Link key={d} href={`?days=${d}`} className={buttonClass(d === days ? "primary" : "secondary", "sm")}>{d} j</Link>)}</div>}>Marketing & funnel</H1>
      <Card>
        <h2 className="mb-4 font-semibold">Funnel d&apos;acquisition ({days} jours)</h2>
        <ol className="space-y-2">
          {STEPS.map(([k, label]) => {
            const v = f.steps[k] ?? 0;
            return (
              <li key={k} className="grid grid-cols-[10rem_1fr_4rem] items-center gap-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className="h-2.5 rounded bg-surface-2"><span className="block h-full rounded bg-accent" style={{ width: `${Math.min(100, (v / top) * 100)}%` }} /></span>
                <span className="text-right tabular-nums">{formatNumber(v)}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-xs text-subtle">Étapes 1–3 : analytics du site (visiteurs uniques). Étapes 4–9 : données de jeu des joueurs arrivés sur la période.</p>
      </Card>
      <Card className="mt-8">
        <h2 className="mb-1 font-semibold">Parcours VÆLORIA ({days} jours)</h2>
        <p className="mb-4 text-xs text-subtle">TikTok → site → inscription → fondateur → empire → lancement. Les étapes après le clic sont comptées côté serveur (sans identifiant de visiteur) : la source d&apos;une inscription n&apos;est connue que par les tableaux UTM ci-dessous.</p>
        <ol className="space-y-2">
          {WORLD_STEPS.map(([k, label]) => {
            const v = f.world?.[k] ?? 0;
            const max = Math.max(1, ...WORLD_STEPS.map(([x]) => f.world?.[x] ?? 0));
            return (
              <li key={k} className="grid grid-cols-[12rem_1fr_4rem] items-center gap-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className="h-2.5 rounded bg-surface-2"><span className="block h-full rounded bg-accent" style={{ width: `${Math.min(100, (v / max) * 100)}%` }} /></span>
                <span className="text-right tabular-nums">{formatNumber(v)}</span>
              </li>
            );
          })}
        </ol>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {WORLD_OTHER.map(([k, label]) => <div key={k} className="rounded-md border border-line p-2"><dt className="text-xs text-muted">{label}</dt><dd className="font-semibold tabular-nums">{formatNumber(f.world?.[k] ?? 0)}</dd></div>)}
        </dl>
      </Card>
      <h2 className="mb-3 mt-8 font-semibold">Sources (utm_source)</h2>
      <Table head={["Source", "Visiteurs", "Copie IP", "Discord", "Conversion IP"]}>
        {m.sources.map((s) => <tr key={s.source}><td className="font-semibold">{s.source}</td><td>{s.visitors}</td><td>{s.copiedIp}</td><td>{s.discord}</td><td>{s.visitors ? `${Math.round((s.copiedIp / s.visitors) * 100)} %` : "—"}</td></tr>)}
      </Table>
      <h2 className="mb-3 mt-8 font-semibold">Campagnes</h2>
      <Table head={["Source", "Medium", "Campagne", "Contenu", "Visiteurs"]}>
        {m.campaigns.map((c, i) => <tr key={i}><td>{c.source}</td><td>{c.medium ?? "—"}</td><td>{c.campaign}</td><td>{c.content ?? "—"}</td><td>{c.visitors}</td></tr>)}
      </Table>
      <h2 className="mb-3 mt-8 font-semibold">Sites référents</h2>
      <Table head={["Domaine", "Visiteurs"]}>{m.referrers.map((r) => <tr key={r.host}><td>{r.host}</td><td>{r.visitors}</td></tr>)}</Table>
      <p className="mt-6 text-xs text-subtle">Lien de campagne type : https://vaeloria.fr/?utm_source=tiktok&amp;utm_medium=video&amp;utm_campaign=saison1&amp;utm_content=clip-raid</p>
    </>
  );
}
