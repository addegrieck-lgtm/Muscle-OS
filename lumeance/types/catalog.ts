export type ProductStatus = "draft" | "published" | "archived";
export type ArtForm =
  "cascade" | "globes" | "halo" | "organic" | "tiers" | "dome" | "sconce" | "floor";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  position: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  /** Légende affichée sur la photo, ex. « Photographie d’ambiance du fabricant ». */
  caption?: string;
  isPrimary: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  finish: string | null;
  priceAdjustment: number; // centimes
  /** Précisions affichées sous le sélecteur (dimensions, hauteur, surface conseillée). */
  details?: string;
  /** Visuel propre à la version (ex. visualisation 3D). */
  imageUrl?: string;
  /** Visuels selon une option sans incidence sur le prix (clé = identifiant de valeur, ex. « chaud »). */
  imageUrls?: Record<string, string>;
  stockQuantity: number;
  active: boolean;
}

export interface ProductOption {
  id: string;
  label: string;
  values: { id: string; label: string }[];
}

export interface ProductPromotion {
  buy: number;
  free: number;
}

export interface SpecLine {
  label: string;
  value: string;
}

export interface Dimensions {
  height?: number;
  width?: number;
  depth?: number;
  diameter?: number;
  cable_length?: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  reference: string;
  shortDescription: string | null;
  description: string | null;
  price: number; // centimes
  compareAtPrice: number | null;
  categoryId: string | null;
  categorySlug: string | null;
  status: ProductStatus;
  featured: boolean;
  dimensions: Dimensions; // millimètres
  weight: number | null; // grammes
  materials: string[];
  finishes: string[];
  specifications: SpecLine[];
  deliveryInformation: string | null;
  assemblyInformation: string | null;
  stockQuantity: number;
  images: ProductImage[];
  variants: ProductVariant[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Illustration de substitution tant qu'aucune photographie réelle n'est disponible. */
  art: ArtForm;
  /** Options sans incidence sur le prix (ex. couleur de lumière), choisies en plus de la version. */
  options?: ProductOption[];
  /** Libellés du sélecteur à deux niveaux : groupe = champ `finish` des variantes. */
  optionLabels?: { group: string; variant: string };
  /** Offre par lot : pour `buy` exemplaires achetés, `free` offerts (toutes versions confondues). */
  promotion?: ProductPromotion;
  /** true = fiche fictive du catalogue de démonstration (jamais en production). */
  isDemo: boolean;
}

export interface HomeContent {
  heroTitle: string;
  heroSignature: string;
  heroText: string;
  manifestoTitle: string;
  manifestoText: string;
  immersiveQuote: string;
  newsletterTitle: string;
}

export interface ShippingSettings {
  standardAmount: number;
  freeThreshold: number;
  deliveryNote: string;
  countries: string[];
}

export interface ContactSettings {
  email: string;
  phone: string;
  address: string;
  legalName: string;
  siret: string;
}
