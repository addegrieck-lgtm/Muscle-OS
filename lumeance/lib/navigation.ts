export const MAIN_NAV = [
  { href: "/collections", label: "Collections" },
  { href: "/collections/lustres", label: "Lustres" },
  { href: "/collections/suspensions", label: "Suspensions" },
  { href: "/collections/appliques", label: "Appliques" },
  { href: "/collections/lampadaires", label: "Lampadaires" },
  { href: "/maison", label: "La Maison" },
  { href: "/journal", label: "Journal" },
] as const;

export const FOOTER_NAV = {
  maison: [
    { href: "/maison", label: "La Maison" },
    { href: "/journal", label: "Journal" },
    { href: "/contact", label: "Contact" },
  ],
  collections: [
    { href: "/collections/lustres", label: "Lustres design" },
    { href: "/collections/suspensions", label: "Suspensions" },
    { href: "/collections/appliques", label: "Appliques murales" },
    { href: "/collections/lampadaires", label: "Lampadaires" },
  ],
  service: [
    { href: "/livraison", label: "Livraison" },
    { href: "/retours", label: "Retours et garanties" },
    { href: "/cgv", label: "Conditions générales de vente" },
    { href: "/mentions-legales", label: "Mentions légales" },
    { href: "/confidentialite", label: "Confidentialité et cookies" },
  ],
} as const;

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
}
