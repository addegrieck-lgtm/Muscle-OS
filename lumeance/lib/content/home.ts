import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { priceRange } from "@/lib/catalog/price-range";
import type { Product } from "@/types/catalog";

/** Pièces phares présentées en tête de page (dans cet ordre, si elles sont publiées). */
export const HERO_SLUGS = ["organza", "ondee", "halo", "ginkgo"];

/** Visuel d'une pièce pour l'accueil : visualisation 3D d'une version intermédiaire, sinon photo. */
export function heroImage(p: Product): string | null {
  const vs = p.variants.filter((v) => v.active && v.imageUrl);
  const mid = vs[Math.floor((vs.length - 1) / 2)];
  return mid?.imageUrl ?? p.images[0]?.url ?? null;
}

export function heroProducts(products: Product[]): Product[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const list = HERO_SLUGS.map((s) => bySlug.get(s)).filter(
    (p): p is Product => !!p && !!heroImage(p),
  );
  return list.length ? list : products.filter((p) => p.featured && heroImage(p)).slice(0, 3);
}

/** Entrée par pièce de la maison : `?piece=` sur /collections. */
export const ROOMS: { id: string; label: string; text: string; slugs: string[] }[] = [
  {
    id: "salle-a-manger",
    label: "Salle à manger et cuisine",
    text: "Au-dessus d’une table ou d’un îlot, une lumière qui rassemble.",
    slugs: ["ginkgo", "constellation", "sylve", "aigrette", "luciole", "organza", "celeste"],
  },
  {
    id: "escalier",
    label: "Escalier et double hauteur",
    text: "Des cascades qui habitent la verticale, de quelques mètres à plusieurs étages.",
    slugs: ["ondee", "halo", "organza", "celeste", "nebuleuse"],
  },
  {
    id: "salon",
    label: "Salon",
    text: "Une pièce maîtresse au centre, des touches de lumière sur les murs.",
    slugs: ["nebuleuse", "celeste", "organza", "aigrette", "sylve", "silhouette", "volute"],
  },
  {
    id: "chambre",
    label: "Chambre",
    text: "Des appliques de chevet et une lumière douce pour le soir.",
    slugs: ["aiguille", "volute", "silhouette", "luciole"],
  },
  {
    id: "entree",
    label: "Entrée et couloir",
    text: "Accueillir dès le seuil, guider le long des murs.",
    slugs: ["volute", "aiguille", "silhouette", "constellation"],
  },
];

export const roomById = (id?: string) => ROOMS.find((r) => r.id === id);

/** Nouveautés : les dernières pièces ajoutées au catalogue (ordre du code ; pièces créées dans
 * l'administration, inconnues du code, considérées comme les plus récentes). */
export function newestProducts(products: Product[], limit = 6): Product[] {
  const rank = new Map(CATALOG_PRODUCTS.map((p, i) => [p.slug, i]));
  return products
    .slice()
    .sort((a, b) => (rank.get(b.slug) ?? 1e6) - (rank.get(a.slug) ?? 1e6))
    .slice(0, limit);
}

/** Surface conseillée d'une version, relevée dans ses précisions (« pièce de 10 à 15 m² »). */
export function surfaceOf(details?: string): [number, number] | null {
  const m = details?.match(/pièce de (\d+)\s*à\s*(\d+)\s*m²/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export interface SizeSuggestion {
  slug: string;
  name: string;
  version: string;
  min: number;
  max: number;
  price: number;
  image: string | null;
}

/** Versions dont la surface conseillée est connue, pour le guide « Quelle taille ? ». */
export function sizeSuggestions(products: Product[]): SizeSuggestion[] {
  return products.flatMap((p) =>
    p.variants.flatMap((v) => {
      const s = v.active ? surfaceOf(v.details) : null;
      return s
        ? [
            {
              slug: p.slug,
              name: p.name,
              version: v.name,
              min: s[0],
              max: s[1],
              price: p.price + v.priceAdjustment,
              image: v.imageUrl ?? p.images[0]?.url ?? null,
            },
          ]
        : [];
    }),
  );
}

/** Pièces en promotion (offre par lot), pour le bandeau des offres. */
export const productsOnOffer = (products: Product[]) => products.filter((p) => p.promotion);

export const fromPrice = (p: Product) => priceRange(p);
