import Link from "next/link";

const LINKS = [
  ["/shop", "Tableau de bord"], ["/shop/products", "Produits"], ["/shop/categories", "Catégories"], ["/shop/promotions", "Promotions"],
  ["/shop/ranks", "Grades & points"], ["/shop/orders", "Commandes"], ["/shop/deliveries", "Livraisons"],
] as const;

export function ShopNav({ active }: { active: string }) {
  return (
    <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line pb-2" aria-label="Boutique">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={active === href ? "page" : undefined}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${active === href ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export const eur = (cents: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
export const dt = (v: string | null) => (v ? new Date(v).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" }) : "—");
