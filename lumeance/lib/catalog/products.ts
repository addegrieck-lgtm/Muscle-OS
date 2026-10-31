import type { Product, ProductVariant } from "@/types/catalog";

/** Prix de vente TTC en centimes depuis le prix d'achat fournisseur (en centimes) :
 * ×1,8 sous 500 €, ×1,5 au-delà, arrondi à la dizaine d'euros supérieure. */
export function salePrice(purchaseCents: number): number {
  const k = purchaseCents < 50000 ? 1.8 : 1.5;
  return Math.ceil((purchaseCents * k) / 1000) * 1000;
}

type Version = [
  shape: string,
  spheres: number,
  canopy: string | null,
  heightM: number | null,
  area: string | null,
  purchaseCents: number,
];

/** Versions du fabricant (fiches techniques fournisseur). null = information non communiquée. */
const CELESTE_VERSIONS: Version[] = [
  ["Rond", 3, "Ø15 cm", 1.5, "5 à 8", 8939],
  ["Rond", 5, "Ø20 cm", 2, "5 à 8", 13439],
  ["Rond", 7, "Ø30 cm", 2.5, "8 à 12", 18699],
  ["Rond", 14, "Ø40 cm", 3, "10 à 15", 32269],
  ["Rond", 26, "Ø50 cm", 4, "15 à 20", 57899],
  ["Rond", 36, null, 5, "20 à 25", 73299],
  ["Rond", 46, "Ø100 cm", 5, "25 à 40", 135139],
  ["Carré", 18, "50 × 50 cm", 3.5, "15 à 20", 34969],
  ["Carré", 26, "50 × 50 cm", 4, "15 à 20", 57899],
  ["Carré", 36, "75 × 75 cm", 5, "20 à 25", 73299],
  ["Carré", 46, "100 × 100 cm", 5, "25 à 40", 135139],
  ["Rectangulaire", 5, "50 × 5 cm", 2, "5 à 8", 15769],
  ["Rectangulaire", 7, "70 × 5 cm", 2.5, "8 à 12", 18699],
  ["Rectangulaire", 14, "85 × 28 cm", 3, "10 à 15", 32269],
  ["Rectangulaire", 18, "85 × 28 cm", null, null, 37099],
  ["Rectangulaire", 36, "110 × 37 cm", 5, "20 à 25", 73299],
];

const CELESTE_BASE_PRICE = Math.min(...CELESTE_VERSIONS.map((v) => salePrice(v[5])));

const fmtM = (m: number) => `${String(m).replace(".", ",")} m`;

const CELESTE_VARIANTS: ProductVariant[] = CELESTE_VERSIONS.map(
  ([shape, n, canopy, h, area, cost]) => {
    const code = `${shape === "Rond" ? "R" : shape === "Carré" ? "C" : "L"}${n}`;
    return {
      id: `celeste-${code.toLowerCase()}`,
      name: `${n} sphères`,
      sku: `LUM-LUS-001-${code}`,
      finish: `Pavillon ${shape.toLowerCase()}`,
      priceAdjustment: salePrice(cost) - CELESTE_BASE_PRICE,
      stockQuantity: 0,
      active: true,
      details: [
        canopy ? `Pavillon ${canopy}` : "Dimensions du pavillon communiquées sur demande",
        h ? `hauteur réglable jusqu’à ${fmtM(h)}` : null,
        area ? `pièce de ${area} m²` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      imageUrl: `/products/celeste/rendu-chaud-${code.toLowerCase()}.webp`,
      imageUrls: Object.fromEntries(
        ["chaud", "neutre", "froid"].map((t) => [
          t,
          `/products/celeste/rendu-${t}-${code.toLowerCase()}.webp`,
        ]),
      ),
    };
  },
);

/**
 * CATALOGUE RÉEL (provisoire, dans le code) — utilisé tant que Supabase n'est pas configuré.
 *
 * Règle : uniquement des informations fournies par le fabricant ou confirmées par LUMÉANCE.
 * Un champ inconnu reste vide (jamais deviné). Seules les fiches « published » sont visibles.
 * À la mise en place de Supabase, ces fiches seront importées dans la base.
 */
export const CATALOG_PRODUCTS: Product[] = [
  {
    id: "lum-lus-001",
    slug: "celeste",
    name: "Céleste",
    reference: "LUM-LUS-001",
    shortDescription:
      "Une cascade de sphères de verre cristal, suspendues à des hauteurs différentes.",
    description: [
      "Céleste compose une pluie de lumière verticale : des sphères de verre cristal, chacune abritant une source LED, descendent à des hauteurs différentes depuis un pavillon unique. Allumée, la composition se lit comme une seule constellation ; éteinte, elle reste une sculpture de verre.",
      "Pensée pour les grandes hauteurs sous plafond — cages d’escalier, mezzanines, halls d’entrée et séjours en double hauteur — elle accompagne le regard d’un niveau à l’autre. La longueur de suspension est réglable pour ajuster la composition à votre volume.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    // Prix de base = version la moins chère ; chaque version porte son écart (voir CELESTE_VARIANTS).
    price: CELESTE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: true,
    dimensions: {}, // propres à chaque version (voir variantes et fiche technique)
    weight: null,
    materials: ["Verre cristal", "Acier inoxydable"],
    finishes: [],
    specifications: [
      { label: "Sources lumineuses", value: "LED, culot G4" },
      { label: "Couleur de lumière", value: "Blanc chaud, blanc neutre ou blanc froid, au choix" },
      { label: "Tension d’entrée", value: "AC 95–265 V" },
      { label: "Pavillon", value: "Rond — Ø40 cm (14 sphères), Ø50 cm (26), Ø100 cm (46)" },
      { label: "Hauteur réglable", value: "Jusqu’à 3 m (14 sphères), 4 m (26), 5 m (36 et 46)" },
      {
        label: "Surface conseillée",
        value: "10–15 m² (14) · 15–20 m² (26) · 20–25 m² (36) · 25–40 m² (46)",
      },
      { label: "Classe énergétique (sources)", value: "F, selon le fabricant" },
      {
        label: "Pièces conseillées",
        value: "Escalier, mezzanine, séjour, salle à manger, couloir",
      },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée pour une pièce de grande hauteur. Indiquez la hauteur disponible pour ajuster la longueur des câbles.",
    stockQuantity: 0,
    images: [
      {
        id: "celeste-1",
        url: "/products/celeste/ambiance-escalier.webp",
        alt: "Lustre Céleste en cascade de sphères de verre cristal dans une cage d’escalier en marbre",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "celeste-2",
        url: "/products/celeste/ambiance-mezzanine.webp",
        alt: "Lustre Céleste suspendu sur trois niveaux devant une mezzanine vitrée",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: CELESTE_VARIANTS,
    optionLabels: { group: "Pavillon", variant: "Nombre de sphères" },
    options: [
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "neutre", label: "Blanc neutre" },
          { id: "froid", label: "Blanc froid" },
        ],
      },
    ],
    seoTitle: "Céleste — lustre cascade en sphères de verre cristal",
    seoDescription:
      "Lustre en cascade de sphères de verre cristal pour cage d’escalier, mezzanine et grande hauteur sous plafond. LED G4, suspension réglable.",
    art: "cascade",
    isDemo: false,
  },
];

export const PUBLISHED_CATALOG = CATALOG_PRODUCTS.filter((p) => p.status === "published");
