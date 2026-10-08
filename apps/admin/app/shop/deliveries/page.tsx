import Link from "next/link";
import { Badge, Button, Table, buttonClass } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { ShopNav, dt } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";
import { retryDelivery } from "@/lib/shopActions";

type D = { id: string; label: string; status: string; username: string; orderPublicId: string | null; createdAt: string; deliveredAt: string | null; lastMessage: string | null };
const STATUSES = ["", "PENDING", "PROCESSING", "DELIVERED", "FAILED", "CANCELLED"];

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const status = (await searchParams).status ?? "";
  let items: D[];
  try {
    items = (await adminApi<{ items: D[] }>(`/shop/deliveries${status ? `?status=${status}` : ""}`)).items;
  } catch (e) {
    return <><H1>Livraisons</H1><ShopNav active="/shop/deliveries" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Livraisons</H1>
      <ShopNav active="/shop/deliveries" />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={buttonClass(s === status ? "primary" : "secondary", "sm")}>{s || "Toutes"}</Link>)}
      </div>
      <Table head={["Livraison", "Joueur", "Commande", "Statut", "Dernier message", "Créée", ""]}>
        {items.map((x) => (
          <tr key={x.id}>
            <td className="font-semibold">{x.label}</td>
            <td>{x.username}</td>
            <td>{x.orderPublicId ? <Link href={`/shop/orders/${x.orderPublicId}`} className="font-mono text-xs hover:text-accent">{x.orderPublicId}</Link> : "—"}</td>
            <td><Badge tone={x.status === "DELIVERED" ? "success" : x.status === "FAILED" ? "danger" : "neutral"}>{x.status}</Badge></td>
            <td className="max-w-64 truncate text-xs text-muted" title={x.lastMessage ?? ""}>{x.lastMessage}</td>
            <td className="text-xs text-muted">{dt(x.createdAt)}</td>
            <td>{x.status === "FAILED" && <form action={retryDelivery.bind(null, x.id)}><Button type="submit" size="sm" variant="secondary">Relancer</Button></form>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
