"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminRole } from "@/lib/auth/admin";

const ITEMS: { href: string; label: string; roles?: AdminRole[] }[] = [
  { href: "/admin/dashboard", label: "Tableau de bord" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/customers", label: "Clients" },
  { href: "/admin/products", label: "Produits", roles: ["super_admin", "admin"] },
  { href: "/admin/categories", label: "Catégories", roles: ["super_admin", "admin"] },
  { href: "/admin/media", label: "Médias", roles: ["super_admin", "admin"] },
  { href: "/admin/content", label: "Contenus", roles: ["super_admin", "admin"] },
  { href: "/admin/messages", label: "Messages et lettre" },
  { href: "/admin/settings", label: "Paramètres", roles: ["super_admin", "admin"] },
  { href: "/admin/activity", label: "Journal d’activité", roles: ["super_admin", "admin"] },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Administration"
      className="overflow-x-auto border-t border-ivoire/10 lg:border-0"
    >
      <ul className="flex gap-1 px-3 py-2 lg:flex-col lg:py-4">
        {ITEMS.filter((i) => !i.roles || i.roles.includes(role)).map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`block whitespace-nowrap px-3 py-2 text-sm transition ${active ? "bg-ivoire/10 text-ivoire" : "text-ivoire/60 hover:text-ivoire"}`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
