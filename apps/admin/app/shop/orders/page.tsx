import Link from "next/link";
import { Badge, Table, buttonClass } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { ShopNav, dt, eur } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";

type O = { publicId: string; status: string; totalCents: number; pointsTotal: number; recipient: string | null; createdAt: string; paidAt: string | null; provider: string | null; failedDeliveries: number };
const STATUSES = ["", "pending", "fulfilled", "paid", "partially_refunded", "refunded", "failed", "expired"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "";
  let items: O[];
  try {
    items = (await adminApi<{ items: O[] }>(`/shop/orders${status ? `?status=${status}` : ""}`)).items;
  } catch (e) {
    return <><H1>Commandes</H1><ShopNav active="/shop/orders" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Commandes</H1>
      <ShopNav active="/shop/orders" />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={buttonClass(s === status ? "primary" : "secondary", "sm")}>{s || "Toutes"}</Link>)}
      </div>
      <Table head={["Commande", "Joueur", "Montant", "Points", "Statut", "Créée", "Payée"]}>
        {items.map((o) => (
          <tr key={o.publicId}>
            <td><Link href={`/shop/orders/${o.publicId}`} className="font-mono text-sm hover:text-accent">{o.publicId}</Link></td>
            <td>{o.recipient ?? "—"}</td>
            <td className="tabular-nums">{eur(o.totalCents)}</td>
            <td className="tabular-nums">+{o.pointsTotal}</td>
            <td><Badge tone={o.status === "fulfilled" ? "success" : o.status === "pending" ? "warning" : o.status.includes("refund") ? "accent" : "neutral"}>{o.status}</Badge>{o.failedDeliveries > 0 && <Badge tone="danger" className="ml-1">livraison</Badge>}</td>
            <td className="text-xs text-muted">{dt(o.createdAt)}</td>
            <td className="text-xs text-muted">{dt(o.paidAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
