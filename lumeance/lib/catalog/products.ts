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
      stockQuantity: 5,
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
      stockQuantity: 5,
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
  stockQuantity: 5,
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
    stockQuantity: 5,
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
      stockQuantity: 5,
      active: true,
      details: [
        `${bulbs} ampoules G9 LED fournies`,
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

// ── Sylve (LUM-LUS-003) ──────────────────────────────────────────────────────
// Fiche fournisseur relevée le 01/11/2026 (modèle 2532 ; prix promotionnels jusqu'au 18/11/2026).
// Le prix de vente part du coût le plus élevé de la taille (version « variable »).
// [longueur (cm), ampoules E14, câbles, surface conseillée, prix fournisseur le plus élevé (centimes)]
const SYLVE_VERSIONS: [number, number, number, string, number][] = [
  [120, 10, 2, "10 à 15", 38299],
  [150, 12, 2, "12 à 18", 45169],
  [185, 18, 2, "15 à 20", 60999],
  [230, 22, 3, "18 à 22", 72439],
  [310, 30, 3, "20 à 25", 92299],
  [450, 45, 5, "22 à 28", 134469],
];
const SYLVE_BASE_PRICE = Math.min(...SYLVE_VERSIONS.map((v) => salePrice(v[4])));
const SYLVE_VARIANTS: ProductVariant[] = SYLVE_VERSIONS.map(
  ([length, bulbs, cables, area, cost]) => ({
    id: `sylve-l${length}`,
    name: `L ${length} cm`,
    sku: `LUM-LUS-003-L${length}`,
    finish: null,
    priceAdjustment: salePrice(cost) - SYLVE_BASE_PRICE,
    stockQuantity: 5,
    active: true,
    details: `${bulbs} ampoules LED E14 fournies · ${length} × 65 cm · ${cables} câbles de suspension réglables · pièce de ${area} m²`,
    imageUrl: `/products/sylve/rendu-l${length}-chaud.webp`,
    // Visualisations 3D selon la lumière (les versions « variables » reprennent la même teinte).
    imageUrls: Object.fromEntries(
      ["chaud", "froid"].flatMap((t) => [
        [t, `/products/sylve/rendu-l${length}-${t}.webp`],
        [`${t}-variable`, `/products/sylve/rendu-l${length}-${t}.webp`],
      ]),
    ),
  }),
);

// ── Constellation (LUM-SUS-003) ──────────────────────────────────────────────
// Fiche fournisseur relevée le 01/11/2026. Prix fournisseur (promotion −16 % jusqu'au 18/11/2026),
// identiques pour l'arc et la droite, le doré et le noir :
//   6 têtes : 93,69 € (lumière fixe), prix habituel 111,93 € ; variable 115,99 € / 138,55 €.
//   8 têtes : 119,39 € (lumière fixe) ; prix habituel ESTIMÉ 142,63 € (même rapport que le
//   6 têtes : 119,39 × 111,93 / 93,69), à confirmer avec le « prix le plus bas des 30 jours ».
// Prix de vente : salePrice() sur le prix fixe HORS promotion, + 10 € : la télécommande (intensité
// variable) est fournie avec chaque version, sans choix à faire (décision du propriétaire).
const CONSTELLATION_REMOTE_EXTRA = 1000;
// [code, forme, têtes, longueur (cm), puissance (W), prix fournisseur fixe hors promotion (centimes)]
const CONSTELLATION_VERSIONS: [string, "Arc" | "Droite", number, number, number, number][] = [
  ["a6", "Arc", 6, 75, 36, 11193],
  ["a8", "Arc", 8, 100, 48, 14263],
  ["d6", "Droite", 6, 75, 36, 11193],
  ["d8", "Droite", 8, 100, 48, 14263],
];
const CONSTELLATION_MIN_PRICE = Math.min(...CONSTELLATION_VERSIONS.map((v) => salePrice(v[5])));
// Prix de base : version la moins chère, télécommande comprise.
const CONSTELLATION_BASE_PRICE = CONSTELLATION_MIN_PRICE + CONSTELLATION_REMOTE_EXTRA;
const CONSTELLATION_VARIANTS: ProductVariant[] = CONSTELLATION_VERSIONS.map(
  ([code, shape, heads, length, watts, cost]) => ({
    id: `constellation-${code}`,
    name: `${heads} têtes · ${length} cm`,
    sku: `LUM-SUS-003-${code.toUpperCase()}`,
    finish: shape,
    priceAdjustment: salePrice(cost) - CONSTELLATION_MIN_PRICE,
    stockQuantity: 5,
    active: true,
    details: [
      `${heads} globes de verre Ø10 à Ø15 cm`,
      `${watts} W`,
      `longueur ${length} cm`,
      "suspension réglable jusqu’à 120 cm",
      "télécommande fournie, intensité variable",
    ].join(" · "),
    imageUrl: `/products/constellation/rendu-${code}-dore-chaud.webp`,
    // Visualisations 3D : finition × couleur de lumière.
    imageUrls: Object.fromEntries(
      ["dore", "noir"].flatMap((f) =>
        ["chaud", "froid"].map((t) => [
          `${f}-${t}`,
          `/products/constellation/rendu-${code}-${f}-${t}.webp`,
        ]),
      ),
    ),
  }),
);

// ── Volute (LUM-APP-002) ─────────────────────────────────────────────────────
// Fiche fournisseur relevée le 01/11/2026 (« LED wall light 10W », IP65). Prix identique quelle que
// soit la finition et la couleur de lumière ; seul le format change le prix. Promotion −11/−12 %
// jusqu'au 18/11/2026 : grand 47,99 € (prix le plus bas des 30 jours : 54,50 €), petit 38,39 €
// (43,68 €). Prix de vente : salePrice() sur le prix HORS promotion.
// Offre du propriétaire : 3 achetées, la 4ᵉ offerte (toutes versions confondues).
// [code, format, hauteur (cm), largeur (cm), prix fournisseur hors promotion (centimes)]
const VOLUTE_VERSIONS: [string, string, number, number, number][] = [
  ["g", "Grand", 28, 10, 5450],
  ["p", "Petit", 23, 8, 4368],
];
const VOLUTE_FINISHES = ["noir", "noir-or", "blanc", "blanc-or"];
const VOLUTE_BASE_PRICE = Math.min(...VOLUTE_VERSIONS.map((v) => salePrice(v[4])));
const VOLUTE_VARIANTS: ProductVariant[] = VOLUTE_VERSIONS.map(([code, label, h, w, cost]) => ({
  id: `volute-${code}`,
  name: `${label} · ${h} cm`,
  sku: `LUM-APP-002-${code.toUpperCase()}`,
  finish: null,
  priceAdjustment: salePrice(cost) - VOLUTE_BASE_PRICE,
  stockQuantity: 5,
  active: true,
  details: `Hauteur ${h} cm · largeur ${w} cm · éclairage vers le haut et vers le bas`,
  imageUrl: `/products/volute/rendu-${code}-noir-or-chaud.webp`,
  // Visualisations 3D : finition × couleur de lumière.
  imageUrls: Object.fromEntries(
    VOLUTE_FINISHES.flatMap((f) =>
      ["chaud", "neutre", "froid"].map((t) => [
        `${f}-${t}`,
        `/products/volute/rendu-${code}-${f}-${t}.webp`,
      ]),
    ),
  ),
}));

// ── Organza (LUM-LUS-004) ────────────────────────────────────────────────────
// Fiches fournisseur relevées le 01/11/2026 (plaques d'acrylique W18 × H28 cm, LED 5 W par plaque).
// Promotion −11 % jusqu'au 18/11/2026 ; prix de vente calculés sur le « prix le plus bas des
// 30 derniers jours avant réduction ». Prix identique pour les finitions (doré, noir, argenté) ;
// relevé sur le doré, lumière chaude. Télécommande (intensité variable) fournie avec chaque version,
// sans choix à faire : +10 € inclus (règle du propriétaire) — prix fournisseur de l'option
// « dimmable » NON relevé, à vérifier.
const ORGANZA_REMOTE_EXTRA = 1000;
// [code, pavillon, plaques, pavillon (cm), surface conseillée (m²), câbles (cm) | null,
//  prix fournisseur hors promotion (centimes)]
const ORGANZA_VERSIONS: [
  string,
  "Rond" | "Rectangulaire",
  number,
  string,
  string | null,
  number | null,
  number,
][] = [
  ["l1", "Rectangulaire", 1, "20 × 5 cm", "3 à 5", null, 8838],
  ["l2", "Rectangulaire", 2, "55 × 12 × 3,5 cm", null, 100, 13790],
  ["l3", "Rectangulaire", 3, "70 × 10 cm", "5 à 10", 150, 17880],
  ["l6", "Rectangulaire", 6, "76 × 24 cm", "8 à 12", 150, 23530],
  ["r6", "Rond", 6, "Ø40 cm", "8 à 12", 150, 23530],
  ["r8", "Rond", 8, "Ø50 cm", "10 à 18", 200, 30135],
  ["r12", "Rond", 12, "Ø60 cm", "10 à 20", 300, 45146],
  ["r18", "Rond", 18, "Ø70 cm", "18 à 25", 300, 67448],
  ["r28", "Rond", 28, "Ø80 cm", "25 à 30", 300, 100161],
];
const ORGANZA_MIN_PRICE = Math.min(...ORGANZA_VERSIONS.map((v) => salePrice(v[6])));
// Prix de base : version la moins chère, télécommande comprise.
const ORGANZA_BASE_PRICE = ORGANZA_MIN_PRICE + ORGANZA_REMOTE_EXTRA;
const ORGANZA_VARIANTS: ProductVariant[] = ORGANZA_VERSIONS.map(
  ([code, shape, n, canopy, area, cable, cost]) => ({
    id: `organza-${code}`,
    name: `${n} plaque${n > 1 ? "s" : ""}`,
    sku: `LUM-LUS-004-${code.toUpperCase()}`,
    finish: `Pavillon ${shape.toLowerCase()}`,
    priceAdjustment: salePrice(cost) - ORGANZA_MIN_PRICE,
    stockQuantity: 5,
    active: true,
    details: [
      `Pavillon ${canopy}`,
      `${n * 5} W`,
      cable ? `câbles de ${cable} cm, réglables` : "longueur de câble sur demande",
      area ? `pièce de ${area} m²` : null,
      "télécommande fournie, intensité variable",
    ]
      .filter(Boolean)
      .join(" · "),
    imageUrl: `/products/organza/rendu-${code}-dore-chaud.webp`,
    // Visualisations 3D : finition × couleur de lumière.
    imageUrls: Object.fromEntries(
      ["dore", "noir", "argent"].flatMap((f) =>
        ["chaud", "froid"].map((t) => [
          `${f}-${t}`,
          `/products/organza/rendu-${code}-${f}-${t}.webp`,
        ]),
      ),
    ),
  }),
);

// ── Aiguille (LUM-APP-003) ───────────────────────────────────────────────────
// Fiche fournisseur relevée le 02/11/2026 : corps H 21 cm, câble 30 cm réglable, rosace Ø5,6 cm,
// LED 5 W. Prix identique pour les finitions et les couleurs de lumière : 39,59 € en promotion,
// 43,25 € (prix le plus bas des 30 jours avant réduction) ; prix de vente sur ce dernier.
const AIGUILLE_COST = 4325;
const AIGUILLE_VARIANTS: ProductVariant[] = [
  {
    id: "aiguille-h21",
    name: "H 21 cm",
    sku: "LUM-APP-003-H21",
    finish: null,
    priceAdjustment: 0,
    stockQuantity: 5,
    active: true,
    details:
      "Corps 21 cm · câble 30 cm, réglable · rosace murale Ø5,6 cm · LED 5 W · pièce de 3 à 8 m²",
    imageUrl: "/products/aiguille/rendu-noir-chaud.webp",
    // Visualisations 3D : finition × couleur de lumière.
    imageUrls: Object.fromEntries(
      ["noir", "dore"].flatMap((f) =>
        ["chaud", "neutre", "froid"].map((t) => [
          `${f}-${t}`,
          `/products/aiguille/rendu-${f}-${t}.webp`,
        ]),
      ),
    ),
  },
];

// ── Halo (LUM-LUS-005) ───────────────────────────────────────────────────────
// Fiches fournisseur relevées le 02/11/2026 : anneaux Ø17 cm, acrylique fumé (« pearl black ») et
// aluminium, acier inoxydable, accents dorés. Promotion −10/−11 %
// jusqu'au 18/11/2026 ; prix hors promotion = prix promotionnel + économie affichée (égal au « prix
// le plus bas des 30 jours » quand celui-ci est cohérent). Puissances annoncées incohérentes entre
// versions (ex. 108 W pour 12, 15 et 18 anneaux) : non reprises par version. Versions 1 et
// 60 anneaux : prix non relevés. Lumière : chaude, neutre ou blanche, ou variation à la
// télécommande (couleur et intensité) ; règle du propriétaire : télécommande fournie avec chaque
// version, +10 € inclus dans le prix de base — prix fournisseur de l'option NON relevé, à vérifier.
const HALO_REMOTE_EXTRA = 1000;
// [anneaux, pavillon Ø (cm), hauteur réglable (cm) | null, prix fournisseur hors promotion (centimes)]
const HALO_VERSIONS: [number, number, number | null, number][] = [
  [3, 30, 120, 11219],
  [5, 35, 120, 16827],
  [6, 40, 180, 17407],
  [8, 40, 210, 24519],
  [10, 45, 280, 30111],
  [12, 50, 320, 36060],
  [15, 50, 350, 42209],
  [18, 60, 450, 54474],
  [21, 60, 500, 61152],
  [24, 60, 550, 67849],
  [28, 70, null, 74942],
  [32, 70, 650, 83235],
  [36, 80, 700, 99255],
  [42, 80, 750, 113572],
  [48, 80, 800, 127580],
];
const HALO_MIN_PRICE = Math.min(...HALO_VERSIONS.map((v) => salePrice(v[3])));
// Prix de base : version la moins chère, télécommande comprise.
const HALO_BASE_PRICE = HALO_MIN_PRICE + HALO_REMOTE_EXTRA;
const HALO_VARIANTS: ProductVariant[] = HALO_VERSIONS.map(([n, canopy, height, cost]) => ({
  id: `halo-a${n}`,
  name: `${n} anneaux`,
  sku: `LUM-LUS-005-A${n}`,
  finish: null,
  priceAdjustment: salePrice(cost) - HALO_MIN_PRICE,
  stockQuantity: 5,
  active: true,
  details: [
    `Pavillon Ø${canopy} cm`,
    height ? `hauteur ${height} cm, réglable` : "hauteur sur demande",
    "anneaux Ø17 cm",
    "télécommande fournie, couleur et intensité réglables",
  ].join(" · "),
  imageUrl: `/products/halo/rendu-a${n}.webp`,
}));

// ── Ginkgo (LUM-LUS-006) ─────────────────────────────────────────────────────
// Fiches fournisseur relevées le 02/11/2026 : feuilles de ginkgo en céramique, branches en acier
// inoxydable brossé plaqué or, ampoules LED E14 fournies, 90–260 V, 15–30 m², garantie 3 ans,
// intensité non réglable. Promotion −18 % jusqu'au 18/11/2026 ; prix de vente sur le « prix le
// plus bas des 30 jours avant réduction » (égal au prix promotionnel + économie affichée). Prix
// identique en lumière chaude ou froide. Nombre d'ampoules non communiqué.
// Prix de vente : écart régulier demandé par le propriétaire (10 € par cm de longueur, de 670 € à
// 1 370 €), au lieu de salePrice() qui donnait 670 / 830 / 920 / 1 370 €. Coefficient sur le prix
// d'achat : ×1,82 / ×1,89 / ×1,76 / ×1,50.
// [code, longueur, largeur, hauteur (cm), prix fournisseur hors promotion, prix de vente (centimes)]
const GINKGO_VERSIONS: [string, number, number, number, number, number][] = [
  ["l80", 80, 40, 30, 36815, 67000],
  ["l100", 100, 45, 40, 46047, 87000],
  ["l120", 120, 55, 50, 60815, 107000],
  ["l150", 150, 55, 50, 91204, 137000],
];
const GINKGO_BASE_PRICE = Math.min(...GINKGO_VERSIONS.map((v) => v[5]));
const GINKGO_VARIANTS: ProductVariant[] = GINKGO_VERSIONS.map(([code, l, w, h, , price]) => ({
  id: `ginkgo-${code}`,
  name: `L ${l} cm`,
  sku: `LUM-LUS-006-${code.toUpperCase()}`,
  finish: null,
  priceAdjustment: price - GINKGO_BASE_PRICE,
  stockQuantity: 5,
  active: true,
  details: `${l} × ${w} × ${h} cm (L × l × H) · ampoules LED E14 fournies`,
  imageUrl: `/products/ginkgo/rendu-${code}-chaud.webp`,
  // Visualisations 3D selon la couleur de lumière.
  imageUrls: Object.fromEntries(
    ["chaud", "froid"].map((t) => [t, `/products/ginkgo/rendu-${code}-${t}.webp`]),
  ),
}));

// ── Ondée (LUM-LUS-007) ──────────────────────────────────────────────────────
// Fiches fournisseur relevées le 02/11/2026 : cônes H 40 cm × Ø3,2 cm en aluminium doré par
// électrolyse, embout acrylique, LED 3 W par cône, 90–260 V, intensité réglable, commande par
// télécommande, garantie 3 ans. Promotion −15/−16 % jusqu'au 18/11/2026 ; prix hors promotion =
// prix promotionnel + économie affichée (le « prix le plus bas des 30 jours » affiché pour 12 et
// 40 cônes est incohérent). Télécommande livrée de série (confirmé par le propriétaire), +10 €
// inclus (règle du propriétaire). Couleur de lumière non précisée.
const ONDEE_REMOTE_EXTRA = 1000;
// [cônes, pavillon Ø (cm), hauteur (cm), puissance (W), surface (m²), prix hors promotion (centimes)]
const ONDEE_VERSIONS: [number, number, number, number, string, number][] = [
  [6, 30, 200, 18, "5 à 10", 14911],
  [9, 40, 250, 27, "6 à 12", 23128],
  [12, 40, 250, 36, "7 à 15", 30844],
  [16, 50, 300, 48, "7 à 15", 40189],
  [25, 60, 400, 75, "15 à 28", 53693],
  [30, 80, 450, 90, "18 à 35", 67731],
  [40, 80, 500, 120, "20 à 38", 79493],
  [48, 80, 650, 144, "24 à 42", 94460],
  [68, 100, 750, 204, "28 à 45", 127967],
];
// Prix à écart régulier (demande du propriétaire) : coefficient dégressif en douceur, de ×1,8
// jusqu'à 300 € d'achat à ×1,5 à partir de 1 000 €, au lieu du palier brutal de salePrice() à
// 500 € ; arrondi à la dizaine supérieure.
const ondeePrice = (cost: number) => {
  const k = 1.8 - 0.3 * Math.min(1, Math.max(0, (cost - 30000) / 70000));
  return Math.ceil((cost * k) / 1000) * 1000;
};
const ONDEE_MIN_PRICE = Math.min(...ONDEE_VERSIONS.map((v) => ondeePrice(v[5])));
// Prix de base : version la moins chère, télécommande comprise.
const ONDEE_BASE_PRICE = ONDEE_MIN_PRICE + ONDEE_REMOTE_EXTRA;
const ONDEE_VARIANTS: ProductVariant[] = ONDEE_VERSIONS.map(([n, canopy, h, w, area, cost]) => ({
  id: `ondee-c${n}`,
  name: `${n} cônes`,
  sku: `LUM-LUS-007-C${n}`,
  finish: null,
  priceAdjustment: ondeePrice(cost) - ONDEE_MIN_PRICE,
  stockQuantity: 5,
  active: true,
  details: `Pavillon Ø${canopy} cm · hauteur ${h} cm, réglable · ${w} W · pièce de ${area} m² · télécommande fournie, intensité variable`,
  imageUrl: `/products/ondee/rendu-c${n}.webp`,
}));

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
    stockQuantity: 5,
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
    stockQuantity: 5,
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
    stockQuantity: 5,
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
    stockQuantity: 5,
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
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Cristal", "Métal"],
    finishes: ["Doré", "Chromé"],
    specifications: [
      {
        label: "Sources lumineuses",
        value: "Ampoules LED fournies, culot G9 — de 8 à 16 selon la version",
      },
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
    stockQuantity: 5,
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
  {
    id: "lum-lus-003",
    slug: "sylve",
    name: "Sylve",
    reference: "LUM-LUS-003",
    shortDescription:
      "Une ramure de métal noir, hérissée de pointes et ponctuée de lumières sous verre.",
    description: [
      "Sylve réinterprète la branche comme une architecture : un réseau organique de rameaux en métal noir mat, aux jonctions fondues comme celles d’un arbre, hérissé de tiges effilées et ponctué de petites ampoules LED sous tube de verre. Allumée, elle diffuse une lumière douce qui révèle ses ombres portées ; éteinte, elle reste une sculpture graphique.",
      "Pensée pour les grands volumes, elle se décline en six longueurs, de 120 cm (10 lumières) à 450 cm (45 lumières), toutes larges de 65 cm : au-dessus d’une table de salle à manger ou d’un îlot, dans un séjour, un hall d’entrée ou une cage d’escalier. Les câbles de suspension se règlent en hauteur.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: SYLVE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Métal", "Verre"],
    finishes: ["Noir mat"],
    specifications: [
      {
        label: "Sources lumineuses",
        value: "Ampoules LED fournies, culot E14 — de 10 à 45 selon la longueur",
      },
      { label: "Diffuseurs", value: "Tubes de verre" },
      { label: "Dimensions", value: "Longueur 120, 150, 185, 230, 310 ou 450 cm × largeur 65 cm" },
      { label: "Suspension", value: "2 à 5 câbles réglables selon la longueur" },
      { label: "Tension d’entrée", value: "AC 90–260 V" },
      { label: "Finition", value: "Métal noir mat" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud 3000 K ou blanc froid 6000 K, fixe ou variable",
      },
      { label: "Garantie annoncée", value: "3 ans" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond, avec plusieurs points de fixation selon la longueur. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée. Indiquez la hauteur sous plafond pour régler la longueur des câbles.",
    stockQuantity: 5,
    images: [
      {
        id: "sylve-1",
        url: "/products/sylve/ambiance-table.webp",
        alt: "Lustre Sylve, ramure de métal noir et lumières sous verre, au-dessus d’une table en marbre",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "sylve-2",
        url: "/products/sylve/ambiance-fenetres.webp",
        alt: "Lustre Sylve vu de près devant des fenêtres en arcade, branches noires hérissées de pointes",
        caption: "Visuel d’ambiance du fabricant",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: SYLVE_VARIANTS,
    options: [
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "froid", label: "Blanc froid" },
          { id: "chaud-variable", label: "Blanc chaud, variable" },
          { id: "froid-variable", label: "Blanc froid, variable" },
        ],
      },
    ],
    seoTitle: "Sylve — lustre branches en métal noir, grande longueur",
    seoDescription:
      "Lustre design en ramure de métal noir mat et lumières LED sous verre, de 120 à 450 cm de long. Pour table de salle à manger, séjour et grands volumes.",
    art: "organic",
    isDemo: false,
  },
  {
    id: "lum-sus-003",
    slug: "constellation",
    name: "Constellation",
    reference: "LUM-SUS-003",
    shortDescription:
      "Une fine branche de métal portant des globes de verre où scintille un ciel de micro-lumières.",
    description: [
      "Constellation pose sur une fine branche de métal une suite de globes de verre clair, de trois diamètres, placés au-dessus, au-dessous ou au fil de la ligne. Dans chacun, un fil de cuivre semé de micro-LED dessine un ciel étoilé ; au centre, une perle dorée marque l’axe de la composition.",
      "La branche se décline en arc, qui s’élève doucement vers son centre, ou en ligne droite, avec six globes sur 75 cm ou huit globes sur 100 cm. Elle accompagne une table de salle à manger, un îlot ou un séjour. Finition dorée ou noire, lumière blanc chaud ou blanc froid ; la télécommande, fournie, règle l’intensité.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: CONSTELLATION_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-suspensions",
    categorySlug: "suspensions",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Verre", "Métal"],
    finishes: ["Doré", "Noir"],
    specifications: [
      {
        label: "Sources lumineuses",
        value: "Micro-LED intégrées sur fil de cuivre, dans chaque globe",
      },
      { label: "Puissance", value: "36 W (6 têtes) · 48 W (8 têtes)" },
      { label: "Tension d’entrée", value: "AC 90–265 V" },
      { label: "Globes", value: "Verre clair, Ø10, Ø12 et Ø15 cm" },
      { label: "Formes", value: "Branche en arc ou droite, 75 cm (6 têtes) ou 100 cm (8 têtes)" },
      { label: "Pavillon", value: "50 × 8 × 3,5 cm" },
      { label: "Suspension", value: "Câbles réglables, hauteur jusqu’à 120 cm" },
      { label: "Finitions", value: "Doré ou noir (perle centrale dorée)" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud ou blanc froid",
      },
      {
        label: "Commande",
        value: "Télécommande fournie : allumage et intensité variable",
      },
      { label: "Matières", value: "Fer, verre" },
      { label: "Surface conseillée", value: "10 à 30 m², selon le fabricant" },
      { label: "Classe énergétique", value: "F, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles, jusqu’à 120 cm.",
    stockQuantity: 5,
    images: [
      {
        id: "constellation-1",
        url: "/products/constellation/ambiance-doree.webp",
        alt: "Suspension Constellation dorée en arc, huit globes de verre étoilés allumés au-dessus d’une table de salle à manger, devant un mur bleu nuit",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
      {
        id: "constellation-2",
        url: "/products/constellation/ambiance-droite-doree.webp",
        alt: "Suspension Constellation dorée à branche droite, huit globes de verre étoilés allumés au-dessus d’une table de salle à manger en bois, devant un mur vert sombre",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: false,
        position: 1,
      },
    ],
    variants: CONSTELLATION_VARIANTS,
    optionLabels: { group: "Forme", variant: "Taille" },
    options: [
      {
        id: "finition",
        label: "Finition",
        values: [
          { id: "dore", label: "Doré" },
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
    seoTitle: "Constellation — suspension globes de verre étoilés, dorée ou noire",
    seoDescription:
      "Suspension design : globes de verre clair à micro-LED étoilées sur une branche en arc ou droite, 75 ou 100 cm. Finition dorée ou noire, lumière chaude ou froide, télécommande fournie.",
    art: "globes",
    isDemo: false,
  },
  {
    id: "lum-app-002",
    slug: "volute",
    name: "Volute",
    reference: "LUM-APP-002",
    shortDescription:
      "Une feuille d’aluminium enroulée en spirale, qui laisse filer la lumière vers le haut et vers le bas.",
    description: [
      "Volute enroule une fine feuille d’aluminium autour de sa source de lumière, comme un ruban qui tourne sur lui-même. Le faisceau s’échappe par le haut et par le bas et dessine sur le mur deux éventails de lumière ; dans les versions bicolores, l’intérieur doré s’allume et répond à la teinte de la lumière.",
      "Étanche (IP65), elle se pose aussi bien dans une entrée, un couloir ou de part et d’autre d’un lit que sur une façade ou une terrasse. Deux formats, 28 ou 23 cm de haut ; noir ou blanc, uni ou doublé d’or ; lumière blanc chaud, naturel ou froid. Offre : pour trois appliques achetées, la quatrième est offerte.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: VOLUTE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-appliques",
    categorySlug: "appliques",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Aluminium"],
    finishes: ["Noir", "Noir et or", "Blanc", "Blanc et or"],
    specifications: [
      { label: "Type", value: "Applique murale LED, éclairage vers le haut et vers le bas" },
      { label: "Puissance", value: "10 W, selon le fabricant" },
      { label: "Étanchéité", value: "IP65 : intérieur et extérieur" },
      { label: "Formats", value: "Grand : 28 × 10 cm · petit : 23 × 8 cm (hauteur × largeur)" },
      { label: "Finitions", value: "Noir, noir et or, blanc, blanc et or (intérieur doré)" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud (2700–3500 K), naturel (3500–5500 K) ou froid (5500–7000 K)",
      },
      { label: "Lumière", value: "Sans scintillement, selon le fabricant" },
      { label: "Matières", value: "Coque en aluminium" },
      { label: "Offre", value: "3 achetées, la 4ᵉ offerte (toutes versions confondues)" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Fixation murale. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée, en particulier en extérieur.",
    stockQuantity: 5,
    images: [
      {
        id: "volute-1",
        url: "/products/volute/ambiance-exterieur.webp",
        alt: "Deux appliques Volute noir et or allumées sur une façade enduite, lumière chaude projetée vers le haut et vers le bas, au crépuscule",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: VOLUTE_VARIANTS,
    options: [
      {
        id: "finition",
        label: "Finition",
        values: [
          { id: "noir", label: "Noir" },
          { id: "noir-or", label: "Noir et or" },
          { id: "blanc", label: "Blanc" },
          { id: "blanc-or", label: "Blanc et or" },
        ],
      },
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "neutre", label: "Blanc naturel" },
          { id: "froid", label: "Blanc froid" },
        ],
      },
    ],
    promotion: { buy: 3, free: 1 },
    seoTitle: "Volute — applique murale LED spirale, noire ou blanche, intérieur doré",
    seoDescription:
      "Applique murale LED en aluminium enroulé en spirale, lumière vers le haut et le bas, étanche IP65 pour l’intérieur et l’extérieur. 28 ou 23 cm, noir ou blanc, uni ou doré. 3 achetées, la 4ᵉ offerte.",
    art: "sconce",
    isDemo: false,
  },
  {
    id: "lum-lus-004",
    slug: "organza",
    name: "Organza",
    reference: "LUM-LUS-004",
    shortDescription:
      "Des voiles d’acrylique ondulés, éclairés par la tranche, qui tombent en cascade comme une étoffe de lumière.",
    description: [
      "Organza suspend des plaques d’acrylique clair, ondulées comme un tissu léger et finement striées. Chacune est coiffée d’une réglette LED qui l’éclaire par la tranche : la lumière court dans la matière, s’accroche aux stries et souligne d’un trait vif le bord découpé de chaque voile.",
      "Du pavillon rond, les plaques descendent en spirale, de six à vingt-huit, pour un séjour, une cage d’escalier ou un volume en double hauteur ; sur un pavillon rectangulaire, d’une à six plaques s’alignent au-dessus d’une table, d’un îlot ou d’un comptoir. Métal doré, noir ou argenté ; lumière blanc chaud ou blanc froid ; la télécommande, fournie, règle l’intensité.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: ORGANZA_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: true,
    dimensions: {},
    weight: null,
    materials: ["Aluminium", "Acrylique", "Acier inoxydable"],
    finishes: ["Doré", "Noir", "Argenté"],
    specifications: [
      { label: "Sources lumineuses", value: "LED intégrées, 5 W par plaque" },
      { label: "Tension d’entrée", value: "110–240 V" },
      { label: "Plaques", value: "Acrylique ondulé et strié, 18 × 28 cm chacune" },
      {
        label: "Pavillons",
        value:
          "Rond : Ø40 (6 plaques), Ø50 (8), Ø60 (12), Ø70 (18), Ø80 cm (28) · rectangulaire : 20 × 5 (1), 55 × 12 (2), 70 × 10 (3), 76 × 24 cm (6)",
      },
      {
        label: "Suspension",
        value: "Câbles réglables : 100 à 300 cm selon la version, longueur sur mesure sur demande",
      },
      { label: "Finitions", value: "Métal doré, noir ou argenté" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud ou blanc froid",
      },
      { label: "Commande", value: "Télécommande fournie : allumage et intensité variable" },
      { label: "Matières", value: "Aluminium, acrylique, acier inoxydable" },
      { label: "Surface conseillée", value: "De 3 à 30 m² selon la version, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles.",
    stockQuantity: 5,
    images: [
      {
        id: "organza-1",
        url: "/products/organza/ambiance-salon.webp",
        alt: "Lustre Organza doré à pavillon rond, cascade de voiles d’acrylique lumineux au-dessus d’un salon en double hauteur, devant un mur anthracite",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: ORGANZA_VARIANTS,
    optionLabels: { group: "Pavillon", variant: "Nombre de plaques" },
    options: [
      {
        id: "finition",
        label: "Finition",
        values: [
          { id: "dore", label: "Doré" },
          { id: "noir", label: "Noir" },
          { id: "argent", label: "Argenté" },
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
    seoTitle: "Organza — lustre LED voiles d’acrylique en cascade, doré, noir ou argenté",
    seoDescription:
      "Lustre design : voiles d’acrylique ondulés éclairés par la tranche, en cascade de 1 à 28 plaques. Pavillon rond ou rectangulaire, métal doré, noir ou argenté, pour séjour, escalier et double hauteur.",
    art: "cascade",
    isDemo: false,
  },
  {
    id: "lum-app-003",
    slug: "aiguille",
    name: "Aiguille",
    reference: "LUM-APP-003",
    shortDescription:
      "Une fine tige de métal et son disque de lumière, prolongés d’un câble qui file jusqu’à une petite rosace.",
    description: [
      "Aiguille trace sur le mur une ligne nette : une tige de métal de 21 cm, coiffée d’un disque lumineux qui éclaire en douceur vers le bas, puis un câble fin qui descend jusqu’à une rosace ronde de 5,6 cm. Le dessin est minimal, presque graphique, allumé comme éteint.",
      "Elle accompagne une tête de lit, un bureau, une liseuse ou un couloir. Métal noir ou doré ; lumière blanc chaud, naturel ou froid.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: salePrice(AIGUILLE_COST),
    compareAtPrice: null,
    categoryId: "demo-cat-appliques",
    categorySlug: "appliques",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: [],
    finishes: ["Noir", "Doré"],
    specifications: [
      { label: "Type", value: "Applique murale LED" },
      { label: "Sources lumineuses", value: "LED intégrée, 5 W, fournie" },
      { label: "Intensité", value: "Réglable, selon le fabricant" },
      { label: "Dimensions", value: "Corps H 21 cm · câble 30 cm, réglable · rosace Ø5,6 cm" },
      { label: "Finitions", value: "Noir ou doré" },
      {
        label: "Couleur de lumière",
        value: "Blanc chaud (2700–3500 K), naturel (3500–5500 K) ou froid (5500–7000 K)",
      },
      { label: "Surface conseillée", value: "3 à 8 m², selon le fabricant" },
      { label: "Garantie", value: "3 ans, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Fixation murale. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée.",
    stockQuantity: 5,
    images: [
      {
        id: "aiguille-1",
        url: "/products/aiguille/ambiance-chambre.webp",
        alt: "Applique Aiguille noire allumée dans une chambre, disque lumineux incliné éclairant le mur au-dessus d’une table de chevet",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: AIGUILLE_VARIANTS,
    options: [
      {
        id: "finition",
        label: "Finition",
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
          { id: "neutre", label: "Blanc naturel" },
          { id: "froid", label: "Blanc froid" },
        ],
      },
    ],
    promotion: { buy: 1, free: 1, percent: 50 },
    seoTitle: "Aiguille — applique murale LED minimaliste, tige et disque lumineux, noire ou dorée",
    seoDescription:
      "Applique murale LED au dessin graphique : tige de 21 cm, disque lumineux, câble jusqu’à une rosace ronde. Noire ou dorée, lumière chaude, naturelle ou froide. Tête de lit, bureau, couloir.",
    art: "sconce",
    isDemo: false,
  },
  {
    id: "lum-lus-005",
    slug: "halo",
    name: "Halo",
    reference: "LUM-LUS-005",
    shortDescription:
      "Des anneaux d’acrylique fumé, cerclés d’un croissant de lumière, qui descendent en spirale.",
    description: [
      "Halo suspend des anneaux de 17 cm en acrylique fumé, presque noir, tenus chacun par une petite boule dorée. Sur la tranche, un croissant de LED s’allume et dessine un arc lumineux qui change d’angle d’un anneau à l’autre ; la matière translucide capte la lumière et les reflets de la pièce.",
      "Les anneaux descendent en spirale sous un pavillon rond noir, de trois anneaux au-dessus d’une table ou d’un îlot jusqu’à quarante-huit pour une cage d’escalier, une mezzanine ou un volume en double hauteur. La hauteur se règle par les câbles ; la télécommande, fournie, règle la couleur de la lumière, du blanc chaud au blanc froid, et son intensité.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: HALO_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Aluminium", "Acrylique", "Acier inoxydable"],
    finishes: ["Noir et or"],
    specifications: [
      { label: "Sources lumineuses", value: "LED intégrées" },
      { label: "Tension d’entrée", value: "90–260 V" },
      {
        label: "Commande",
        value: "Télécommande fournie : couleur de lumière (chaude, neutre, blanche) et intensité",
      },
      { label: "Anneaux", value: "Ø17 cm, acrylique fumé, boule d’attache dorée" },
      { label: "Versions", value: "De 3 à 48 anneaux, pavillon rond Ø30 à Ø80 cm" },
      { label: "Suspension", value: "Câbles réglables : de 120 à 800 cm selon la version" },
      { label: "Finition", value: "Noir et or" },
      { label: "Matières", value: "Acier inoxydable, aluminium, acrylique" },
      { label: "Usages", value: "Escalier, duplex, mezzanine, séjour, restaurant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles.",
    stockQuantity: 5,
    images: [
      {
        id: "halo-1",
        url: "/products/halo/ambiance-escalier.webp",
        alt: "Lustre Halo allumé dans une cage d’escalier en double hauteur, anneaux d’acrylique fumé cerclés de lumière descendant en spirale",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: HALO_VARIANTS,
    seoTitle: "Halo — lustre LED anneaux en cascade pour escalier et double hauteur",
    seoDescription:
      "Lustre design : anneaux d’acrylique fumé cerclés de LED, en spirale de 3 à 48 anneaux sous un pavillon rond noir. Télécommande fournie. Pour escalier, duplex, mezzanine et grands volumes.",
    art: "halo",
    isDemo: false,
  },
  {
    id: "lum-lus-006",
    slug: "ginkgo",
    name: "Ginkgo",
    reference: "LUM-LUS-006",
    shortDescription:
      "Une ramure dorée chargée de feuilles de ginkgo en céramique blanche, où la lumière se niche.",
    description: [
      "Ginkgo étire au-dessus de la table une ramure de métal doré brossé, couverte de feuilles de ginkgo en céramique blanche mate. Les ampoules se cachent dans le feuillage : allumée, la pièce rayonne doucement à travers les feuilles, comme une branche saisie dans la lumière du soir.",
      "Sa forme allongée accompagne une table de salle à manger, un îlot de cuisine ou une console, de 80 à 150 cm de long. Lumière blanc chaud ou blanc froid.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: GINKGO_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Céramique", "Acier inoxydable"],
    finishes: ["Doré brossé"],
    specifications: [
      { label: "Sources lumineuses", value: "Ampoules LED E14, fournies" },
      { label: "Tension d’entrée", value: "90–260 V" },
      { label: "Feuilles", value: "Céramique blanche mate" },
      { label: "Structure", value: "Acier inoxydable brossé, plaqué or" },
      {
        label: "Dimensions (L × l × H)",
        value: "80 × 40 × 30, 100 × 45 × 40, 120 × 55 × 50 ou 150 × 55 × 50 cm",
      },
      { label: "Suspension", value: "Câbles fins réglables" },
      { label: "Couleur de lumière", value: "Blanc chaud ou blanc froid" },
      { label: "Surface conseillée", value: "15 à 30 m², selon le fabricant" },
      { label: "Garantie", value: "3 ans, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles.",
    stockQuantity: 5,
    images: [
      {
        id: "ginkgo-1",
        url: "/products/ginkgo/ambiance-cuisine.webp",
        alt: "Lustre Ginkgo allumé au-dessus d’un îlot de cuisine sombre, ramure dorée couverte de feuilles de ginkgo en céramique blanche",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: GINKGO_VARIANTS,
    options: [
      {
        id: "lumiere",
        label: "Couleur de lumière",
        values: [
          { id: "chaud", label: "Blanc chaud" },
          { id: "froid", label: "Blanc froid" },
        ],
      },
    ],
    seoTitle: "Ginkgo — lustre feuilles de céramique blanche sur ramure dorée",
    seoDescription:
      "Lustre design allongé : feuilles de ginkgo en céramique blanche sur une ramure en acier doré brossé, ampoules LED fournies. De 80 à 150 cm, pour table de salle à manger et îlot de cuisine.",
    art: "organic",
    isDemo: false,
  },
  {
    id: "lum-lus-007",
    slug: "ondee",
    name: "Ondée",
    reference: "LUM-LUS-007",
    shortDescription:
      "Une pluie de cônes dorés, effilés comme des gouttes, dont chaque pointe s’allume.",
    description: [
      "Ondée fait tomber du plafond une pluie de cônes d’aluminium doré, longs de 40 cm et fins comme des gouttes étirées. À la base de chacun, un embout d’acrylique s’allume : de loin, la cascade dessine une constellation de points lumineux suspendus dans le vide.",
      "Les cônes descendent en spirale sous un pavillon rond doré, de six au-dessus d’une table ou d’un îlot jusqu’à soixante-huit pour une cage d’escalier ou un volume de plusieurs étages. La hauteur se règle par les fils ; la télécommande, fournie, règle l’intensité.",
      "Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.",
    ].join("\n\n"),
    price: ONDEE_BASE_PRICE,
    compareAtPrice: null,
    categoryId: "demo-cat-lustres",
    categorySlug: "lustres",
    status: "published",
    featured: false,
    dimensions: {},
    weight: null,
    materials: ["Aluminium", "Acrylique"],
    finishes: ["Doré"],
    specifications: [
      { label: "Sources lumineuses", value: "LED intégrées, 3 W par cône" },
      { label: "Tension d’entrée", value: "90–260 V" },
      { label: "Cônes", value: "H 40 cm, Ø3,2 cm, aluminium doré, embout acrylique" },
      { label: "Versions", value: "De 6 à 68 cônes, pavillon rond Ø30 à Ø100 cm (H 3 cm)" },
      {
        label: "Suspension",
        value: "Fils réglables, de 200 à 750 cm selon la version ; longueur sur mesure sur demande",
      },
      { label: "Commande", value: "Télécommande fournie : allumage et intensité variable" },
      { label: "Matières", value: "Aluminium doré par électrolyse, acrylique" },
      { label: "Garantie", value: "3 ans, selon le fabricant" },
    ],
    deliveryInformation: null,
    assemblyInformation:
      "Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les fils.",
    stockQuantity: 5,
    images: [
      {
        id: "ondee-1",
        url: "/products/ondee/ambiance-escalier.webp",
        alt: "Lustre Ondée allumé dans une cage d’escalier hélicoïdale, cascade de cônes dorés aux pointes lumineuses",
        caption: "Photographie d’ambiance du fabricant",
        isPrimary: true,
        position: 0,
      },
    ],
    variants: ONDEE_VARIANTS,
    seoTitle: "Ondée — lustre LED cascade de cônes dorés pour escalier et double hauteur",
    seoDescription:
      "Lustre design : pluie de cônes d’aluminium doré aux pointes lumineuses, de 6 à 68 cônes sous un pavillon rond. Télécommande fournie. Pour escalier, duplex et grands volumes.",
    art: "cascade",
    isDemo: false,
  },
];

export const PUBLISHED_CATALOG = CATALOG_PRODUCTS.filter((p) => p.status === "published");
