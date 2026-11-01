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

// ── Silhouette (LUM-APP-001) ─────────────────────────────────────────────────
const SILHOUETTE_MOTIFS = [
  { id: "envol", label: "Envol", file: "a" },
  { id: "rendez-vous", label: "Rendez-vous", file: "b" },
  { id: "offrande", label: "Offrande", file: "c" },
  { id: "elan", label: "Élan", file: "d" },
  { id: "sous-la-pluie", label: "Sous la pluie", file: "e" },
];
// [code, largeur cm, hauteur cm, prix fournisseur (centimes)]
const SILHOUETTE_SIZES: [string, number, number, number][] = [
  ["4080", 40, 80, 11236],
  ["30120", 30, 120, 11339],
  ["40140", 40, 140, 16299],
];
const SILHOUETTE_BASE_PRICE = Math.min(...SILHOUETTE_SIZES.map((v) => salePrice(v[3])));
const SILHOUETTE_VARIANTS: ProductVariant[] = SILHOUETTE_SIZES.map(([code, w, h, cost]) => ({
  id: `silhouette-${w}x${h}`,
  name: `${w} × ${h} cm`,
  sku: `LUM-APP-001-${code}`,
  finish: null,
  priceAdjustment: salePrice(cost) - SILHOUETTE_BASE_PRICE,
  stockQuantity: 0,
  active: true,
  details: `Tableau lumineux ${w} × ${h} cm · éclairage LED en périphérie du cadre`,
  imageUrl: "/products/silhouette/motif-a.webp",
  // Visuel du motif choisi, quels que soient le cadre et la couleur de lumière.
  imageUrls: Object.fromEntries(
    SILHOUETTE_MOTIFS.flatMap((m) =>
      ["noir", "dore"].flatMap((c) =>
        ["chaud", "froid"].map((t) => [
          `${m.id}-${c}-${t}`,
          `/products/silhouette/motif-${m.file}.webp`,
        ]),
      ),
    ),
  ),
}));

// ── Nébuleuse (LUM-LUS-002) ──────────────────────────────────────────────────
// [sphères, puissance W, Ø pavillon cm, suspension max cm, surface m², prix fournisseur hors promotion (centimes)]
// Prix hors promotion = prix promo + économie affichée. Versions 3, 5 et 6 sphères : prix non communiqué.
const NEBULEUSE_VERSIONS: [number, number, number, number, string, number][] = [
  [8, 48, 40, 180, "15 à 20", 15862],
  [10, 60, 50, 200, "20 à 25", 18309],
  [12, 60, 50, 220, "22 à 28", 21414],
  [15, 90, 60, 250, "25 à 30", 24920],
  [18, 110, 60, 300, "30 à 35", 28077],
  [24, 140, 60, 400, "35 à 40", 36132],
  [30, 180, 60, 500, "40 à 45", 42190],
];
const NEBULEUSE_BASE_PRICE = Math.min(...NEBULEUSE_VERSIONS.map((v) => salePrice(v[5])));
const NEBULEUSE_VARIANTS: ProductVariant[] = NEBULEUSE_VERSIONS.map(
  ([n, watt, canopy, wire, area, cost]) => ({
    id: `nebuleuse-${n}`,
    name: `${n} sphères`,
    sku: `LUM-LUS-002-${n}`,
    finish: null,
    priceAdjustment: salePrice(cost) - NEBULEUSE_BASE_PRICE,
    stockQuantity: 0,
    active: true,
    details: `Pavillon Ø${canopy} cm · suspension réglable jusqu’à ${String(wire / 100).replace(".", ",")} m · ${watt} W · pièce de ${area} m²`,
    imageUrl: `/products/nebuleuse/version-${n}.webp`,
    // Visualisations 3D : verre × pavillon × couleur de lumière.
    imageUrls: Object.fromEntries(
      ["cognac", "fume"].flatMap((v) =>
        ["dore", "argente", "noir"].flatMap((pv) =>
          ["chaud", "neutre", "froid"].map((t) => [
            `${v}-${pv}-${t}`,
            `/products/nebuleuse/rendu-${n}-${v}-${pv}-${t}.webp`,
          ]),
        ),
      ),
    ),
  }),
);

// ── Aigrette (LUM-SUS-002) ───────────────────────────────────────────────────
// Fiche fournisseur relevée le 01/11/2026 (prix promotionnels, promotion jusqu'au 18/11/2026).
// Le prix de vente part du coût le plus élevé du modèle (version « 3 teintes commutables »).
// [forme, taille (cm), ampoules G9, éléments de cristal, prix fournisseur le plus élevé (centimes)]
type AigretteVersion = ["Ronde" | "Linéaire", number, number, number, number];
const AIGRETTE_VERSIONS: AigretteVersion[] = [
  ["Ronde", 40, 8, 31, 5339],
  ["Ronde", 50, 9, 60, 8169],
  ["Ronde", 55, 12, 76, 10899],
  ["Ronde", 60, 16, 140, 16239],
  ["Ronde", 80, 16, 140, 20039],
  ["Linéaire", 72, 9, 63, 10069],
  ["Linéaire", 92, 12, 83, 11969],
];
const AIGRETTE_BASE_PRICE = Math.min(...AIGRETTE_VERSIONS.map((v) => salePrice(v[4])));
const AIGRETTE_FINISHES = ["dore", "chrome"];
const AIGRETTE_TEMPS = ["chaud", "neutre", "froid"];
const AIGRETTE_VARIANTS: ProductVariant[] = AIGRETTE_VERSIONS.map(
  ([shape, size, bulbs, crystals, cost]) => {
    const code = `${shape === "Ronde" ? "r" : "l"}${size}`;
    return {
      id: `aigrette-${code}`,
      name: shape === "Ronde" ? `Ø${size} cm` : `L ${size} cm`,
      sku: `LUM-SUS-002-${code.toUpperCase()}`,
      finish: shape,
      priceAdjustment: salePrice(cost) - AIGRETTE_BASE_PRICE,
      stockQuantity: 0,
      active: true,
      details: [
        `${bulbs} ampoules G9 LED`,
        `${crystals} éléments de cristal`,
        shape === "Linéaire" ? "hauteur 40 cm · pavillon 50 cm" : null,
        "suspension réglable jusqu’à 1,5 m",
      ]
        .filter(Boolean)
        .join(" · "),
      imageUrl: `/products/aigrette/ambiance-${shape === "Ronde" ? "ronde" : "lineaire"}.webp`,
      // Visualisations 3D : finition × couleur de lumière (« 3 teintes » = rendu blanc neutre).
      imageUrls: Object.fromEntries(
        AIGRETTE_FINISHES.flatMap((f) =>
          [...AIGRETTE_TEMPS, "commutable"].map((t) => [
            `${f}-${t}`,
            `/products/aigrette/rendu-${code}-${f}-${t === "commutable" ? "neutre" : t}.webp`,
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
  {
    id: "lum-app-001",
    slug: "silhouette",
    name: "Silhouette",
    reference: "LUM-APP-001",
    shortDescription: "Un tableau lumineux : une sculpture en ombre portée, auréolée de lumière.",
    description: [
      "Silhouette tient à la fois de l’œuvre et du luminaire. Sur un fond texturé gris perle, une figure sculpturale se détache en noir profond ; un liseré de lumière LED court tout autour du cadre et dessine un halo doux sur le mur.",
      "Pensée pour une entrée, un couloir, une tête de lit ou un pan de mur de salon, elle installe une atmosphère de galerie. Trois formats, cinq motifs, un cadre noir ou doré, une lumière chaude ou froide.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: SILHOUETTE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-appliques",
    categorySlug: "appliques",
    status: "published",
    featured: true,
    dimensions: {},
    weight: null,
    materials: [],
    finishes: ["Cadre noir", "Cadre doré"],
    specifications: [
      { label: "Type", value: "Applique murale / tableau lumineux LED" },
      { label: "Formats", value: "40 × 80, 30 × 120 ou 40 × 140 cm" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud (2700–3500 K) ou blanc froid (5500–7000 K)",
      },
      { label: "Cadre", value: "Noir ou doré" },
      { label: "Classe énergétique", value: "F, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Fixation murale. Le raccordement électrique doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée.",
    stockQuantity: 0,
    images: [
      {
        id: "silhouette-1",
        url: "/products/silhouette/ambiance.webp",
        alt: "Tableau lumineux Silhouette, figure sculpturale noire dans un cadre éclairé, au fond d’un couloir sombre",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "silhouette-composition",
        url: "/products/silhouette/composition.webp",
        alt: "Vue éclatée de Silhouette : panneau arrière, cadre, œuvre imprimée et ruban lumineux LED",
        caption: "Composition — visualisation 3D",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: SILHOUETTE_VARIANTS,
    options: [
      {
        id: "motif",
        label: "Motif",
        values: SILHOUETTE_MOTIFS.map(({ id, label }) => ({ id, label })),
      },
      {
        id: "cadre",
        label: "Cadre",
        values: [
          { id: "noir", label: "Noir" },
          { id: "dore", label: "Doré" },
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
    seoTitle: "Silhouette — tableau lumineux LED, applique murale design",
    seoDescription:
      "Tableau lumineux LED : figure sculpturale noire sur fond texturé, halo de lumière autour du cadre. Cinq motifs, cadre noir ou doré, lumière chaude ou froide.",
    art: "sconce",
    isDemo: false,
  },
  {
    id: "lum-lus-002",
    slug: "nebuleuse",
    name: "Nébuleuse",
    reference: "LUM-LUS-002",
    shortDescription:
      "Une cascade de sphères de verre où scintillent des centaines de micro-lumières.",
    description: [
      "Nébuleuse suspend dans le vide des sphères de verre teinté, chacune habitée d’un nuage de micro-LED. Allumée, chaque globe devient une petite galaxie ; ensemble, elles composent une constellation qui descend le long d’une cage d’escalier ou d’un séjour en double hauteur.",
      "Sept compositions, de 8 à 30 sphères, avec suspensions réglables jusqu’à 5 m. Verre cognac ou gris fumé, pavillon argenté, doré ou noir, et trois températures de lumière.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: NEBULEUSE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: true,
    dimensions: {},
    weight: null,
    materials: ["Verre", "Métal"],
    finishes: ["Argenté", "Doré", "Noir"],
    specifications: [
      { label: "Sources lumineuses", value: "Micro-LED intégrées dans chaque sphère" },
      { label: "Puissance", value: "De 48 W (8 sphères) à 180 W (30 sphères)" },
      { label: "Verre", value: "Cognac ou gris fumé" },
      { label: "Pavillon", value: "Rond, Ø40 à Ø60 cm selon la version ; argenté, doré ou noir" },
      { label: "Couleur de lumière", value: "Blanc chaud 3000 K, neutre 4000 K ou froid 5500 K" },
      { label: "Classe énergétique", value: "A, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée pour une pièce de grande hauteur. La longueur de chaque câble se règle à l’installation.",
    stockQuantity: 0,
    images: [
      {
        id: "nebuleuse-1",
        url: "/products/nebuleuse/ambiance-escalier.webp",
        alt: "Lustre Nébuleuse, cascade de sphères de verre fumé lumineuses dans un escalier hélicoïdal en double hauteur",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: NEBULEUSE_VARIANTS,
    options: [
      {
        id: "verre",
        label: "Couleur du verre",
        values: [
          { id: "cognac", label: "Cognac" },
          { id: "fume", label: "Gris fumé" },
        ],
      },
      {
        id: "pavillon",
        label: "Pavillon",
        values: [
          { id: "dore", label: "Doré" },
          { id: "argente", label: "Argenté" },
          { id: "noir", label: "Noir" },
        ],
      },
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
    seoTitle: "Nébuleuse — lustre cascade en sphères de verre à micro-LED",
    seoDescription:
      "Lustre en cascade pour escalier et double hauteur : sphères de verre cognac ou gris fumé à micro-LED, de 8 à 30 sphères, suspension réglable jusqu’à 5 m.",
    art: "cascade",
    isDemo: false,
  },
  {
    id: "lum-sus-002",
    slug: "aigrette",
    name: "Aigrette",
    reference: "LUM-SUS-002",
    shortDescription:
      "Une boule de lumière rayonnante, hérissée de fines tiges perlées de cristal.",
    description: [
      "Aigrette emprunte sa silhouette à la fleur de pissenlit montée en graine : depuis un cœur de métal, des centaines de tiges fines rayonnent dans toutes les directions, chacune terminée par une petite ramure perlée de cristal. Allumée, la lumière des ampoules se démultiplie dans les cristaux et dessine un halo scintillant ; éteinte, elle reste une sculpture aérienne.",
      "La version ronde, de Ø40 à Ø80 cm, s’installe au centre d’un salon, d’une chambre ou d’une entrée ; la version linéaire, de 72 ou 92 cm, accompagne une table de salle à manger ou un îlot. Finition dorée ou chromée, lumière blanc chaud, neutre ou froid, ou trois teintes commutables à l’interrupteur.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: AIGRETTE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-suspensions",
    categorySlug: "suspensions",
    status: "draft",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Cristal", "Métal"],
    finishes: ["Doré", "Chromé"],
    specifications: [
      { label: "Sources lumineuses", value: "Ampoules LED, culot G9 — de 8 à 16 selon la version" },
      { label: "Tension d’entrée", value: "AC 90–260 V" },
      { label: "Flux lumineux", value: "De 249 à 2 000 lm selon la version" },
      {
        label: "Formes",
        value: "Ronde (Ø40, 50, 55, 60 ou 80 cm) ou linéaire (72 ou 92 cm, hauteur 40 cm)",
      },
      { label: "Suspension", value: "Câble réglable jusqu’à 1,5 m" },
      { label: "Finitions", value: "Doré ou chromé" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud, blanc neutre, blanc froid, ou trois teintes commutables",
      },
      { label: "Surface conseillée", value: "10 à 15 m², selon le fabricant" },
      { label: "Garantie fabricant", value: "3 ans" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. Les tiges se mettent en place à la main lors du montage.",
    stockQuantity: 0,
    images: [
      {
        id: "aigrette-1",
        url: "/products/aigrette/ambiance-ronde.webp",
        alt: "Suspension Aigrette ronde dorée, boule de tiges perlées de cristal allumée dans un salon aux murs gris",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "aigrette-2",
        url: "/products/aigrette/ambiance-lineaire.webp",
        alt: "Suspension Aigrette linéaire dorée au-dessus d’une table de salle à manger en bois",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: AIGRETTE_VARIANTS,
    optionLabels: { group: "Forme", variant: "Taille" },
    options: [
      {
        id: "finition",
        label: "Finition",
        values: [
          { id: "dore", label: "Doré" },
          { id: "chrome", label: "Chromé" },
        ],
      },
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "neutre", label: "Blanc neutre" },
          { id: "froid", label: "Blanc froid" },
          { id: "commutable", label: "3 teintes commutables" },
        ],
      },
    ],
    seoTitle: "Aigrette — suspension boule de cristal façon pissenlit",
    seoDescription:
      "Suspension design en boule de tiges perlées de cristal, ronde de Ø40 à Ø80 cm ou linéaire. Finition dorée ou chromée, ampoules LED G9, lumière blanc chaud, neutre ou froid.",
    art: "globes",
    isDemo: false,
  },
];

export const PUBLISHED_CATALOG = CATALOG_PRODUCTS.filter((p) => p.status === "published");
