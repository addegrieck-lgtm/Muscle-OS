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
    price: 0, // À COMPLÉTER : prix de vente TTC en centimes
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "draft", // passe à « published » une fois le prix et la configuration validés
    featured: true,
    dimensions: {}, // À COMPLÉTER : diamètre du pavillon, nombre et diamètres des sphères
    weight: null,
    materials: ["Verre cristal", "Acier inoxydable"],
    finishes: [],
    specifications: [
      { label: "Sources lumineuses", value: "LED, culot G4" },
      { label: "Tension d’entrée", value: "AC 95–265 V" },
      { label: "Suspension", value: "Câbles réglables, longueur de 3, 4 ou 5 m sur demande" },
      { label: "Pavillon", value: "Rond (versions carrée et rectangulaire chez le fabricant)" },
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
    variants: [],
    seoTitle: "Céleste — lustre cascade en sphères de verre cristal",
    seoDescription:
      "Lustre en cascade de sphères de verre cristal pour cage d’escalier, mezzanine et grande hauteur sous plafond. LED G4, suspension réglable.",
    art: "cascade",
    isDemo: false,
  },
];

export const PUBLISHED_CATALOG = CATALOG_PRODUCTS.filter((p) => p.status === "published");
