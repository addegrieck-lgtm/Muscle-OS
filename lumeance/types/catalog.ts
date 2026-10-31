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
  isPrimary: boolean;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  finish: string | null;
  priceAdjustment: number; // centimes
  stockQuantity: number;
  active: boolean;
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
