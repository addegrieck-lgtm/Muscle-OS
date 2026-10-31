import type { Category, Product } from "@/types/catalog";

/**
 * CATALOGUE DE DÉMONSTRATION — pièces FICTIVES.
 *
 * Utilisé uniquement lorsque Supabase n'est pas configuré, pour présenter la mise en scène du
 * showroom. Aucun nom, prix, dimension ou matériau ci-dessous ne décrit un produit réel :
 * le site affiche un bandeau « Aperçu — pièces fictives » et chaque fiche le rappelle.
 * Aucune certification, origine, stock ou délai n'est indiqué.
 */
export const DEMO_CATEGORIES: Category[] = [
  {
    id: "demo-cat-lustres",
    name: "Lustres",
    slug: "lustres",
    description:
      "Lustres monumentaux et compositions en cascade, pensés pour les grandes hauteurs sous plafond, les cages d’escalier et les pièces de réception.",
    imagePath: null,
    position: 1,
  },
  {
    id: "demo-cat-suspensions",
    name: "Suspensions",
    slug: "suspensions",
    description:
      "Suspensions XXL, verre soufflé, cristal et compositions organiques : des volumes de lumière au-dessus d’une table, d’un îlot ou d’un salon.",
    imagePath: null,
    position: 2,
  },
  {
    id: "demo-cat-appliques",
    name: "Appliques",
    slug: "appliques",
    description:
      "Appliques murales sculpturales qui dessinent la lumière sur la paroi et rythment un couloir, une chambre ou un escalier.",
    imagePath: null,
    position: 3,
  },
  {
    id: "demo-cat-lampadaires",
    name: "Lampadaires",
    slug: "lampadaires",
    description:
      "Lampadaires sculpturaux : des présences lumineuses à hauteur d’homme, autant objets d’art que sources de lumière.",
    imagePath: null,
    position: 4,
  },
];

type Seed = Pick<
  Product,
  "slug" | "name" | "shortDescription" | "description" | "price" | "art"
> & {
  category: string;
  featured?: boolean;
  materials: string[];
  finishes: string[];
  dimensions: Product["dimensions"];
};

const NOTE =
  "Pièce fictive présentée à titre d’illustration : les caractéristiques définitives, la fiche technique et les délais seront publiés après vérification auprès du fournisseur.";

const seeds: Seed[] = [
  {
    slug: "cascade-aurore",
    name: "Cascade Aurore",
    category: "lustres",
    featured: true,
    art: "cascade",
    price: 98000,
    materials: ["Verre soufflé", "Laiton"],
    finishes: ["Laiton brossé"],
    dimensions: { height: 1800, diameter: 600 },
    shortDescription: "Une pluie de sphères de verre suspendues à des hauteurs différentes.",
    description:
      "Pensée pour les cages d’escalier et les grandes hauteurs sous plafond, Cascade Aurore compose une chute verticale de globes de verre. Chaque sphère capte la lumière de sa voisine : l’ensemble se lit comme une seule matière lumineuse, de jour comme de nuit.",
  },
  {
    slug: "constellation",
    name: "Constellation",
    category: "lustres",
    featured: true,
    art: "globes",
    price: 89000,
    materials: ["Verre", "Métal doré"],
    finishes: ["Doré satiné"],
    dimensions: { height: 900, diameter: 1100 },
    shortDescription: "Des globes de verre en orbite autour d’une structure dorée.",
    description:
      "Constellation dessine un ciel de globes au-dessus d’une table de salle à manger ou d’un salon double hauteur. Les bras fins disparaissent dans la lumière ; seuls restent les points lumineux, comme suspendus dans l’air.",
  },
  {
    slug: "halo-celeste",
    name: "Halo Céleste",
    category: "lustres",
    featured: true,
    art: "halo",
    price: 74000,
    materials: ["Métal", "Cristal"],
    finishes: ["Champagne"],
    dimensions: { height: 400, diameter: 1000 },
    shortDescription: "Un anneau de lumière ponctué de gouttes de cristal.",
    description:
      "Un cercle parfait, une couronne de cristaux, une lumière indirecte qui glisse au plafond. Halo Céleste apporte une géométrie calme aux pièces de réception et aux grands volumes contemporains.",
  },
  {
    slug: "vestale",
    name: "Vestale",
    category: "lustres",
    art: "tiers",
    price: 96000,
    materials: ["Cristal", "Laiton"],
    finishes: ["Laiton poli"],
    dimensions: { height: 1200, diameter: 800 },
    shortDescription: "Une architecture de cristal en trois niveaux.",
    description:
      "Vestale revisite le lustre classique : trois couronnes superposées, des pampilles de cristal et une silhouette élancée qui accompagne les escaliers monumentaux.",
  },
  {
    slug: "liane-dor",
    name: "Liane d’or",
    category: "suspensions",
    featured: true,
    art: "organic",
    price: 68000,
    materials: ["Métal doré"],
    finishes: ["Feuille d’or"],
    dimensions: { height: 500, width: 1400 },
    shortDescription: "Une composition organique de feuilles dorées.",
    description:
      "Comme une branche saisie dans la lumière, Liane d’or s’étire au-dessus d’un îlot ou d’une longue table. Ses feuilles de métal doré diffusent une lumière chaude et dessinent des ombres végétales.",
  },
  {
    slug: "ondine",
    name: "Ondine",
    category: "suspensions",
    art: "dome",
    price: 42000,
    materials: ["Verre soufflé"],
    finishes: ["Verre ambré"],
    dimensions: { height: 380, diameter: 520 },
    shortDescription: "Un dôme de verre soufflé aux reflets ambrés.",
    description:
      "Ondine est une suspension XXL au volume généreux. Le verre ambré adoucit la lumière et lui donne la chaleur d’une fin de journée.",
  },
  {
    slug: "nuee",
    name: "Nuée",
    category: "suspensions",
    featured: true,
    art: "cascade",
    price: 58000,
    materials: ["Verre", "Laiton"],
    finishes: ["Laiton brossé"],
    dimensions: { height: 1200, diameter: 450 },
    shortDescription: "Une grappe de sphères pour les espaces plus intimes.",
    description:
      "Nuée reprend l’écriture de la cascade dans un format plus resserré, idéal au-dessus d’une console, dans une entrée ou une chambre.",
  },
  {
    slug: "eclat",
    name: "Éclat",
    category: "suspensions",
    art: "globes",
    price: 46000,
    materials: ["Verre", "Laiton"],
    finishes: ["Laiton"],
    dimensions: { height: 600, diameter: 700 },
    shortDescription: "Une sphère de lumière, des reflets multipliés.",
    description:
      "Éclat rassemble des globes autour d’un cœur de laiton. Une pièce généreuse qui suffit à installer une atmosphère.",
  },
  {
    slug: "sillage",
    name: "Sillage",
    category: "appliques",
    featured: true,
    art: "sconce",
    price: 32000,
    materials: ["Laiton", "Verre opalin"],
    finishes: ["Laiton brossé"],
    dimensions: { height: 450, width: 220, depth: 180 },
    shortDescription: "Une courbe de laiton qui retient un globe opalin.",
    description:
      "Sillage dessine une ligne fluide sur le mur et diffuse une lumière douce, pensée pour accompagner un escalier, un couloir ou une tête de lit.",
  },
  {
    slug: "oree",
    name: "Orée",
    category: "appliques",
    art: "sconce",
    price: 36000,
    materials: ["Métal doré", "Verre"],
    finishes: ["Champagne"],
    dimensions: { height: 520, width: 260, depth: 200 },
    shortDescription: "Une applique comme un lever de soleil sur la paroi.",
    description:
      "Orée projette un halo vers le haut et vers le bas, révélant la matière du mur : pierre, enduit ou boiserie.",
  },
  {
    slug: "albatre",
    name: "Albâtre",
    category: "lampadaires",
    featured: true,
    art: "floor",
    price: 79000,
    materials: ["Métal", "Verre opalin"],
    finishes: ["Brun bronze"],
    dimensions: { height: 1850, width: 600 },
    shortDescription: "Une arche sculpturale et un globe opalin.",
    description:
      "Albâtre se tient comme une sculpture : une arche élancée, un globe suspendu, une lumière qui enveloppe un fauteuil ou un coin lecture.",
  },
  {
    slug: "phare",
    name: "Phare",
    category: "lampadaires",
    art: "floor",
    price: 64000,
    materials: ["Laiton", "Verre"],
    finishes: ["Laiton patiné"],
    dimensions: { height: 1650, width: 400 },
    shortDescription: "Une verticale de laiton, une lumière tenue.",
    description:
      "Phare joue sur la tension entre une tige fine et un diffuseur généreux. Une présence élégante dans un salon ou un bureau.",
  },
];

export const DEMO_PRODUCTS: Product[] = seeds.map((s, i) => {
  const cat = DEMO_CATEGORIES.find((c) => c.slug === s.category)!;
  return {
    id: `demo-${s.slug}`,
    slug: s.slug,
    name: s.name,
    reference: `DEMO-${String(i + 1).padStart(3, "0")}`,
    shortDescription: s.shortDescription,
    description: `${s.description}\n\n${NOTE}`,
    price: s.price,
    compareAtPrice: null,
    categoryId: cat.id,
    categorySlug: cat.slug,
    status: "published",
    featured: Boolean(s.featured),
    dimensions: s.dimensions,
    weight: null,
    materials: s.materials,
    finishes: s.finishes,
    specifications: [],
    deliveryInformation: null,
    assemblyInformation: null,
    stockQuantity: 0,
    images: [],
    variants:
      s.finishes.length > 0 && s.category === "appliques"
        ? [
            {
              id: `demo-${s.slug}-v1`,
              name: s.finishes[0]!,
              sku: `DEMO-${i + 1}-A`,
              finish: s.finishes[0]!,
              priceAdjustment: 0,
              stockQuantity: 0,
              active: true,
            },
            {
              id: `demo-${s.slug}-v2`,
              name: "Noir mat",
              sku: `DEMO-${i + 1}-B`,
              finish: "Noir mat",
              priceAdjustment: 2000,
              stockQuantity: 0,
              active: true,
            },
          ]
        : [],
    seoTitle: null,
    seoDescription: null,
    art: s.art,
    isDemo: true,
  };
});
