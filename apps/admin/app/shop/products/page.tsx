import Link from "next/link";
import { Badge, Button, Table, buttonClass } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { ShopNav, eur } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";
import { deleteProduct } from "@/lib/shopActions";

type P = { id: string; name: string; slug: string; category: string; priceCents: number; points: number | null; active: boolean; stock: number | null; deliveryType: string; deliveries: number; rank: string | null };

export default async function ProductsPage() {
  let items: P[];
  try {
    items = (await adminApi<{ items: P[] }>("/shop/products")).items;
  } catch (e) {
    return <><H1>Produits</H1><ShopNav active="/shop/products" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1 action={<Link href="/shop/products/new" className={buttonClass("primary", "sm")}>Créer un produit</Link>}>Produits</H1>
      <ShopNav active="/shop/products" />
      <Table head={["Produit", "Catégorie", "Prix", "Points", "Livraison", "Stock", "Statut", ""]}>
        {items.map((p) => (
          <tr key={p.id}>
            <td><Link href={`/shop/products/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>{p.rank && <span className="ml-2 text-xs text-accent">grade {p.rank}</span>}</td>
            <td className="text-muted">{p.category}</td>
            <td className="tabular-nums">{eur(p.priceCents)}</td>
            <td className="tabular-nums">{p.points ?? <span className="text-subtle">auto</span>}</td>
            <td className={p.deliveries === 0 ? "text-danger" : "text-muted"}>{p.deliveryType} · {p.deliveries} action{p.deliveries > 1 ? "s" : ""}</td>
            <td>{p.stock ?? "∞"}</td>
            <td><Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Actif" : "Inactif"}</Badge></td>
            <td className="text-right"><form action={deleteProduct.bind(null, p.id)}><Button type="submit" variant="ghost" size="sm" className="text-danger">Supprimer</Button></form></td>
          </tr>
        ))}
      </Table>
      <p className="mt-3 text-xs text-subtle">Un produit déjà vendu n&apos;est jamais supprimé : il est désactivé pour conserver l&apos;historique des commandes.</p>
    </>
  );
}
