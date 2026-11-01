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
// ── Luciole (LUM-SUS-001) ────────────────────────────────────────────────────
// [forme, dimension (cm), nombre de lumières, surface conseillée, prix fournisseur hors promotion (centimes)]
type LucioleVersion = ["Couronne" | "Linéaire", number, number, string, number];
const LUCIOLE_VERSIONS: LucioleVersion[] = [
  ["Couronne", 50, 30, "10 à 15", 9772],
  ["Couronne", 60, 81, "18 à 20", 25641],
  ["Couronne", 80, 108, "20 à 25", 29485],
  ["Couronne", 98, 108, "20 à 25", 38213],
  ["Couronne", 105, 135, "25 à 30", 42678],
  ["Couronne", 125, 162, "30 à 35", 69418],
  ["Linéaire", 100, 81, "18 à 20", 25832],
];
const LUCIOLE_BASE_PRICE = Math.min(...LUCIOLE_VERSIONS.map((v) => salePrice(v[4])));
const LUCIOLE_VARIANTS: ProductVariant[] = LUCIOLE_VERSIONS.map(
  ([shape, size, lights, area, cost]) => {
    const code = `${shape === "Couronne" ? "C" : "L"}${size}`;
    return {
      id: `luciole-${code.toLowerCase()}`,
      name: shape === "Couronne" ? `Ø${size} cm` : `L ${size} cm`,
      sku: `LUM-SUS-001-${code}`,
      finish: shape,
      priceAdjustment: salePrice(cost) - LUCIOLE_BASE_PRICE,
      stockQuantity: 0,
      active: true,
      details: `${lights} lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de ${area} m²`,
      imageUrl: `/products/luciole/ambiance-${shape === "Couronne" ? "couronne" : "lineaire"}.webp`,
      // Visualisations 3D pour chaque couleur de structure × couleur de lumière.
      imageUrls: Object.fromEntries(
        ["or-champagne", "or-rose", "sable-dore", "noir"].flatMap((f) =>
          ["chaud", "froid"].map((t) => [
            `${f}-${t}`,
            `/products/luciole/rendu-${code.toLowerCase()}-${f}-${t}.webp`,
          ]),
        ),
      ),
    };
  },
);

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
  {
    id: "lum-sus-001",
    slug: "luciole",
    name: "Luciole",
    reference: "LUM-SUS-001",
    shortDescription:
      "Une constellation de petites lumières portées par de fines branches de métal.",
    description: [
      "Luciole déploie autour d’un anneau ou d’une barre de métal une ramure de tiges fines, chacune terminée par une petite source lumineuse sous un diffuseur en acrylique. Allumée, elle évoque un essaim de lucioles suspendu au-dessus de la pièce ; éteinte, un dessin graphique et végétal.",
      "La couronne s’installe au-dessus d’un salon ou au centre d’une pièce de vie ; la version linéaire accompagne une table de salle à manger ou un îlot. Sept tailles, de 30 à 162 lumières, pour s’accorder au volume.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    // Prix de base = version la moins chère ; règle de prix : salePrice() sur le prix fournisseur hors promotion.
    price: LUCIOLE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-suspensions",
    categorySlug: "suspensions",
    status: "published",
    featured: true,
    dimensions: {},
    weight: null,
    materials: ["Métal", "Acrylique"],
    finishes: [],
    specifications: [
      {
        label: "Sources lumineuses",
        value: "LED, de 30 à 162 selon la version ; sources remplaçables",
      },
      { label: "Diffuseurs", value: "Acrylique" },
      { label: "Hauteur du luminaire", value: "35 cm" },
      { label: "Suspension", value: "Câbles réglables jusqu’à 1,5 m" },
      { label: "Formes", value: "Couronne (Ø50 à Ø125 cm) ou linéaire (100 cm)" },
      { label: "Couleurs de structure", value: "Or champagne, or rose, sable doré ou noir" },
      { label: "Couleur de lumière", value: "Blanc chaud ou blanc froid" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. Les branches se positionnent à la main lors de l’installation.",
    stockQuantity: 0,
    images: [
      {
        id: "luciole-1",
        url: "/products/luciole/ambiance-couronne.webp",
        alt: "Suspension Luciole en couronne, lumières sur fines branches, au-dessus d’un salon avec cheminée",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "luciole-2",
        url: "/products/luciole/ambiance-lineaire.webp",
        alt: "Suspension Luciole linéaire au-dessus d’une table de salle à manger en marbre",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: LUCIOLE_VARIANTS,
    optionLabels: { group: "Forme", variant: "Taille" },
    // Options du fabricant, sans incidence sur le prix (à confirmer si le fournisseur facture une teinte).
    options: [
      {
        id: "structure",
        label: "Couleur de la structure",
        values: [
          { id: "or-champagne", label: "Or champagne" },
          { id: "or-rose", label: "Or rose" },
          { id: "sable-dore", label: "Sable doré" },
          { id: "noir", label: "Noir" },
        ],
      },
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "froid", label: "Blanc froid" },
        ],
      },
    ],
    seoTitle: "Luciole — suspension design à branches lumineuses",
    seoDescription:
      "Suspension design en couronne ou linéaire : fines branches de métal et petites sources LED sous diffuseurs acryliques. Sept tailles, de 30 à 162 lumières.",
    art: "organic",
    isDemo: false,
  },
];

export const PUBLISHED_CATALOG = CATALOG_PRODUCTS.filter((p) => p.status === "published");
