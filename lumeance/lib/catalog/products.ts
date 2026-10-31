import type { Product } from "@/types/catalog";

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
    // Prix de vente TTC (centimes). Règle : ×1,8 le prix fournisseur au-delà de 500 €, ×2,2 en deçà,
    // arrondi à la dizaine supérieure. Prix de base = plus petite version (14 sphères).
    price: 71000,
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
    variants: [
      {
        id: "celeste-14",
        name: "14 sphères — Ø40 cm",
        sku: "LUM-LUS-001-14",
        finish: null,
        priceAdjustment: 0,
        stockQuantity: 0,
        active: true,
      },
      {
        id: "celeste-26",
        name: "26 sphères — Ø50 cm",
        sku: "LUM-LUS-001-26",
        finish: null,
        priceAdjustment: 34000,
        stockQuantity: 0,
        active: true,
      },
      {
        id: "celeste-36",
        name: "36 sphères",
        sku: "LUM-LUS-001-36",
        finish: null,
        priceAdjustment: 61000,
        stockQuantity: 0,
        active: true,
      },
      {
        id: "celeste-46",
        name: "46 sphères — Ø100 cm",
        sku: "LUM-LUS-001-46",
        finish: null,
        priceAdjustment: 173000,
        stockQuantity: 0,
        active: true,
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
