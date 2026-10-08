import Link from "next/link";
import { Badge, Button, Table, buttonClass } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { ShopNav, dt, eur } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";
import { deletePromotion } from "@/lib/shopActions";

type P = { id: string; name: string; label: string | null; kind: string; value: number; targetType: string; targetName: string | null; startsAt: string; endsAt: string | null; active: boolean; live: boolean };
const value = (p: P) => (p.kind === "percent" ? `−${p.value} %` : p.kind === "fixed" ? `−${eur(p.value)}` : `+${p.value} pts`);

export default async function PromotionsPage() {
  let items: P[];
  try {
    items = (await adminApi<{ items: P[] }>("/shop/promotions")).items;
  } catch (e) {
    return <><H1>Promotions</H1><ShopNav active="/shop/promotions" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1 action={<Link href="/shop/promotions/new" className={buttonClass("primary", "sm")}>Créer une promotion</Link>}>Promotions</H1>
      <ShopNav active="/shop/promotions" />
      <Table head={["Promotion", "Effet", "Cible", "Période", "Statut", ""]}>
        {items.map((p) => (
          <tr key={p.id}>
            <td><Link href={`/shop/promotions/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>{p.label && <span className="ml-2 text-xs text-accent">{p.label}</span>}</td>
            <td className="tabular-nums">{value(p)}</td>
            <td className="text-muted">{p.targetType === "all" ? "Toute la boutique" : p.targetName}</td>
            <td className="text-xs text-muted">{dt(p.startsAt)} → {p.endsAt ? dt(p.endsAt) : "sans fin"}</td>
            <td><Badge tone={p.live ? "success" : "neutral"}>{p.live ? "En cours" : p.active ? "Programmée / terminée" : "Inactive"}</Badge></td>
            <td className="text-right"><form action={deletePromotion.bind(null, p.id)}><Button type="submit" variant="ghost" size="sm" className="text-danger">Supprimer</Button></form></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
