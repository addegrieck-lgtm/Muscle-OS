import { StatCard, Table } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { ShopNav, eur } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";

type D = {
  kpi: Record<string, number>;
  ranks: { key: string; name: string; minPoints: number; unlocked: number }[];
  topProducts: { name: string; quantity: number; revenueCents: number; points: number }[];
  funnel: { name: string; count: number }[];
};

const FUNNEL: [string, string][] = [["shop_view", "Visites boutique"], ["product_view", "Fiches produit"], ["add_to_cart", "Ajouts au panier"], ["checkout_started", "Paiements commencés"], ["payment_started", "Redirections prestataire"], ["payment_success", "Paiements réussis"], ["payment_failed", "Paiements échoués"], ["order_delivered", "Livraisons effectuées"]];

export default async function ShopDashboard() {
  let d: D;
  try {
    d = await adminApi<D>("/shop/dashboard");
  } catch (e) {
    return <><H1>Boutique</H1><ShopNav active="/shop" /><ErrorBox message={(e as Error).message} /></>;
  }
  const k = d.kpi;
  const failRate = k.deliveries30d ? Math.round((k.deliveriesFailed30d! / k.deliveries30d) * 1000) / 10 : 0;
  const funnel = new Map(d.funnel.map((f) => [f.name, f.count]));
  return (
    <>
      <H1>Boutique</H1>
      <ShopNav active="/shop" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="CA total" value={eur(k.revenueTotalCents!)} hint={`Ce mois : ${eur(k.revenueMonthCents!)}`} />
        <StatCard label="CA aujourd'hui" value={eur(k.revenueTodayCents!)} />
        <StatCard label="Commandes aujourd'hui" value={k.ordersToday} hint={`Ce mois : ${k.ordersMonth}`} />
        <StatCard label="Points générés" value={k.pointsGenerated} />
        <StatCard label="Paiements en attente" value={k.pendingPayments} />
        <StatCard label="Échec de livraison (30 j)" value={<span className={failRate > 0 ? "text-danger" : ""}>{failRate} %</span>} hint={`${k.deliveriesFailed30d} / ${k.deliveries30d} · ${k.deliveriesPending} en cours`} />
        <StatCard label="Remboursements" value={k.refundsCount} hint={eur(k.refundsCents!)} />
        <StatCard label="Grades à examiner" value={<span className={k.ranksToReview ? "text-warning" : ""}>{k.ranksToReview}</span>} />
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold">Grades débloqués</h2>
          <Table head={["Grade", "Seuil", "Joueurs"]}>
            {d.ranks.map((r) => <tr key={r.key}><td className="font-semibold">{r.name}</td><td>{r.minPoints} pts</td><td>{r.unlocked}</td></tr>)}
          </Table>
        </div>
        <div>
          <h2 className="mb-3 font-semibold">Funnel boutique (30 jours)</h2>
          <Table head={["Étape", "Événements"]}>
            {FUNNEL.map(([key, label]) => <tr key={key}><td>{label}</td><td className="tabular-nums">{funnel.get(key) ?? 0}</td></tr>)}
          </Table>
        </div>
      </div>
      <h2 className="mb-3 mt-10 font-semibold">Produits les plus vendus</h2>
      <Table head={["Produit", "Ventes", "CA", "Points générés"]}>
        {d.topProducts.map((p) => <tr key={p.name}><td className="font-semibold">{p.name}</td><td>{p.quantity}</td><td>{eur(p.revenueCents)}</td><td>{p.points}</td></tr>)}
      </Table>
    </>
  );
}
