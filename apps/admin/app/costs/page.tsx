import { Card, StatCard, Table } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { adminApi } from "@/lib/api";

type Costs = {
  items: { name: string; provider: string; category: string; monthlyEur: number; variableRatio: number }[];
  monthlyTotalEur: number;
  referencePlayers: number;
  peakOnline30d: number;
  projections: { players100: number; players1000: number };
  latestMetrics: Record<string, unknown> | null;
};

const eur = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

export default async function CostsPage() {
  let c: Costs;
  try {
    c = await adminApi<Costs>("/costs");
  } catch (e) {
    return <><H1>Coûts</H1><ErrorBox message={(e as Error).message} /></>;
  }
  const perPlayer = c.peakOnline30d > 0 ? c.monthlyTotalEur / c.peakOnline30d : null;
  return (
    <>
      <H1>Coûts d&apos;infrastructure</H1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Coût mensuel estimé" value={eur(c.monthlyTotalEur)} />
        <StatCard label="Projection 100 joueurs" value={eur(c.projections.players100)} hint="simultanés, par mois" />
        <StatCard label="Projection 1 000 joueurs" value={eur(c.projections.players1000)} hint="simultanés, par mois" />
        <StatCard label="Coût / joueur (pic 30 j)" value={perPlayer !== null ? eur(perPlayer) : "—"} hint={`Pic : ${c.peakOnline30d} joueurs`} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Postes</h2>
      <Table head={["Poste", "Fournisseur", "Catégorie", "€/mois", "Part variable"]}>
        {c.items.map((i) => <tr key={i.name}><td className="font-semibold">{i.name}</td><td className="text-muted">{i.provider}</td><td>{i.category}</td><td>{eur(i.monthlyEur)}</td><td>{Math.round(i.variableRatio * 100)} %</td></tr>)}
      </Table>
      <Card className="mt-8 text-sm text-muted">
        <p className="font-semibold text-fg">Méthode</p>
        <p className="mt-2">Projection = part fixe + part variable × (joueurs / capacité de référence = {c.referencePlayers}). Estimation volontairement simple pour décider quand monter en gamme ; à recaler sur les factures réelles.</p>
        <p className="mt-2">Métriques machine (CPU, RAM, base, bande passante) : {c.latestMetrics ? `dernière collecte ${String(c.latestMetrics.collected_at)}` : "aucune collecte — à brancher (voir docs/SCALABILITY.md)"}.</p>
      </Card>
    </>
  );
}
