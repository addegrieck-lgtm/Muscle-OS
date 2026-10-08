import { Badge, Button, Card, Table } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { RefundForm } from "@/components/ShopForms";
import { ShopNav, dt, eur } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";
import { refulfillOrder } from "@/lib/shopActions";

type Detail = {
  order: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  items: { name: string; quantity: number; unitPriceCents: number; originalPriceCents: number | null; pointsPerUnit: number }[];
  payments: { provider: string; providerPaymentId: string; status: string; amountCents: number; createdAt: string }[];
  events: { id: string; type: string; outcome: string | null; receivedAt: string }[];
  deliveries: { id: string; label: string; status: string; createdAt: string; deliveredAt: string | null; logs: { status: string; message: string; at: string }[] }[];
  points: { delta: number; balanceAfter: number; reason: string; label: string; createdAt: string }[];
  refunds: { amountCents: number; reason: string | null; source: string; createdAt: string }[];
};

export default async function OrderDetail({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let d: Detail;
  try {
    d = await adminApi<Detail>(`/shop/orders/${publicId}`);
  } catch (e) {
    return <><H1>{publicId}</H1><ShopNav active="/shop/orders" /><ErrorBox message={(e as Error).message} /></>;
  }
  const o = d.order;
  const refunded = d.refunds.reduce((s, r) => s + r.amountCents, 0);
  return (
    <>
      <H1>Commande {publicId}</H1>
      <ShopNav active="/shop/orders" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><p className="text-xs uppercase text-subtle">Statut</p><p className="mt-1"><Badge>{o.status}</Badge></p><p className="mt-2 text-sm text-muted">Créée {dt(o.created_at)} · payée {dt(o.paid_at)}</p></Card>
        <Card><p className="text-xs uppercase text-subtle">Destinataire</p><p className="mt-1 font-semibold">{o.recipient_username}</p><p className="font-mono text-xs text-subtle">{o.player_uuid}</p><p className="mt-1 text-sm text-muted">Acheteur : {o.buyer ?? "—"}</p></Card>
        <Card><p className="text-xs uppercase text-subtle">Montant</p><p className="mt-1 font-display text-2xl font-bold">{eur(o.total_cents)}</p><p className="text-sm text-muted">+{o.points_total} points · remise {eur(o.discount_cents)}</p></Card>
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Articles</h2>
      <Table head={["Produit", "Qté", "Prix unitaire", "Points / unité"]}>
        {d.items.map((i, k) => <tr key={k}><td>{i.name}</td><td>{i.quantity}</td><td>{eur(i.unitPriceCents)}{i.originalPriceCents && i.originalPriceCents !== i.unitPriceCents ? <s className="ml-2 text-xs text-subtle">{eur(i.originalPriceCents)}</s> : null}</td><td>{i.pointsPerUnit}</td></tr>)}
      </Table>

      <h2 className="mb-2 mt-8 font-semibold">Livraisons</h2>
      <div className="space-y-2">
        {d.deliveries.map((x) => (
          <details key={x.id} className="rounded-md border border-line p-3">
            <summary className="flex cursor-pointer items-center justify-between gap-2"><span>{x.label}</span><Badge tone={x.status === "DELIVERED" ? "success" : x.status === "FAILED" ? "danger" : "neutral"}>{x.status}</Badge></summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">{x.logs.map((l, k) => <li key={k}>{dt(l.at)} — {l.status} — {l.message}</li>)}</ul>
          </details>
        ))}
      </div>
      {["paid", "fulfilled"].includes(o.status) && <form action={refulfillOrder.bind(null, publicId)} className="mt-2"><Button type="submit" variant="ghost" size="sm">Relancer la livraison (sans doublon)</Button></form>}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Paiements & webhooks</h2>
          <ul className="space-y-1 text-sm">
            {d.payments.map((p) => <li key={p.providerPaymentId}>{p.provider} · <span className="font-mono text-xs">{p.providerPaymentId}</span> · {p.status} · {eur(p.amountCents)}</li>)}
            {d.events.map((e) => <li key={e.id} className="text-xs text-muted">{dt(e.receivedAt)} — {e.type} → {e.outcome ?? "en cours"}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Points</h2>
          <ul className="space-y-1 text-sm">{d.points.map((p, k) => <li key={k}><span className={p.delta > 0 ? "text-success" : "text-danger"}>{p.delta > 0 ? "+" : ""}{p.delta}</span> — {p.label} <span className="text-xs text-subtle">(solde {p.balanceAfter})</span></li>)}</ul>
        </div>
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Remboursements</h2>
      <ul className="mb-3 space-y-1 text-sm">{d.refunds.map((r, k) => <li key={k}>{dt(r.createdAt)} — {eur(r.amountCents)} ({r.source}) {r.reason ? `· ${r.reason}` : ""}</li>)}</ul>
      {d.payments.length > 0 && o.total_cents - refunded > 0 && (
        <Card>
          <p className="mb-3 text-sm text-muted">À utiliser seulement si le remboursement a été fait chez le prestataire sans notification automatique. Les points sont retirés au prorata ; rien n&apos;est retiré en jeu automatiquement.</p>
          <RefundForm publicId={publicId} maxCents={o.total_cents - refunded} />
        </Card>
      )}
    </>
  );
}
