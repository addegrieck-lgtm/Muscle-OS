import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Minuscules, chiffres et tirets uniquement");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Adresse e-mail invalide");

// ── Panier ────────────────────────────────────────────────────────────────
export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable(),
  quantity: z.number().int().min(1).max(10),
  /** Options sans incidence sur le prix, ex. { lumiere: "chaud" }. Validées côté serveur. */
  options: z
    .record(z.string().regex(/^[a-z0-9-]{1,30}$/), z.string().regex(/^[a-z0-9-]{1,30}$/))
    .refine((o) => Object.keys(o).length <= 5)
    .optional(),
});
export const cartSchema = z.array(cartLineSchema).max(30);
export type CartLineInput = z.infer<typeof cartLineSchema>;

// ── Formulaires publics ───────────────────────────────────────────────────
export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal("on", { message: "Votre consentement est nécessaire" }),
  source: z.string().max(60).default("site"),
  // Pot de miel anti-robots : doit rester vide.
  website: z.string().max(0).optional().default(""),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Indiquez votre nom").max(120),
  email: emailSchema,
  subject: z.string().trim().min(1, "Indiquez un objet").max(160),
  message: z.string().trim().min(10, "Votre message est trop court").max(5000),
  website: z.string().max(0).optional().default(""),
});

// ── Administration ────────────────────────────────────────────────────────
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const cents = z.number().int().min(0).max(100_000_000);

export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    slug: slugSchema,
    reference: z.string().trim().min(1).max(60),
    short_description: optionalText(300),
    description: optionalText(8000),
    price: cents,
    compare_at_price: cents.nullable(),
    category_id: z.string().uuid().nullable(),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean(),
    dimensions: z
      .object({
        height: z.number().int().positive().max(20000).optional(),
        width: z.number().int().positive().max(20000).optional(),
        depth: z.number().int().positive().max(20000).optional(),
        diameter: z.number().int().positive().max(20000).optional(),
        cable_length: z.number().int().positive().max(20000).optional(),
      })
      .strict(),
    weight: z.number().int().positive().max(1_000_000).nullable(),
    materials: z.array(z.string().trim().min(1).max(60)).max(12),
    finishes: z.array(z.string().trim().min(1).max(60)).max(12),
    technical_specifications: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          value: z.string().trim().min(1).max(300),
        }),
      )
      .max(40),
    delivery_information: optionalText(2000),
    assembly_information: optionalText(2000),
    stock_quantity: z.number().int().min(0).max(100000),
    seo_title: optionalText(70),
    seo_description: optionalText(170),
  })
  .refine((p) => p.compare_at_price === null || p.compare_at_price > p.price, {
    message: "Le prix barré doit être supérieur au prix de vente",
    path: ["compare_at_price"],
  });
export type ProductInput = z.infer<typeof productSchema>;

export const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().min(1).max(60),
  finish: optionalText(60),
  details: optionalText(300),
  price_adjustment: z.number().int().min(-100_000_000).max(100_000_000),
  stock_quantity: z.number().int().min(0).max(100000),
  active: z.boolean(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  description: optionalText(1000),
  position: z.number().int().min(0).max(1000),
  active: z.boolean(),
});

export const ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "partially_refunded",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const orderStatusChangeSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  note: optionalText(500),
});

export const addressSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  address_line_1: z.string().trim().min(1).max(200),
  address_line_2: optionalText(200),
  postal_code: z.string().trim().min(2).max(12),
  city: z.string().trim().min(1).max(100),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
});

export const manualOrderSchema = z.object({
  email: emailSchema,
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: optionalText(30),
  address: addressSchema,
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().nullable(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  shipping_amount: cents,
  discount_amount: cents,
  admin_notes: optionalText(2000),
});

export const homeContentSchema = z.object({
  heroTitle: z.string().trim().min(1).max(60),
  heroSignature: z.string().trim().min(1).max(120),
  heroText: z.string().trim().min(1).max(300),
  manifestoTitle: z.string().trim().min(1).max(120),
  manifestoText: z.string().trim().min(1).max(2000),
  immersiveQuote: z.string().trim().min(1).max(160),
  newsletterTitle: z.string().trim().min(1).max(160),
});

export const shippingSettingsSchema = z.object({
  standardAmount: cents,
  freeThreshold: cents,
  deliveryNote: z.string().trim().max(600),
  countries: z
    .array(z.string().regex(/^[A-Z]{2}$/))
    .min(1)
    .max(30),
});

export const contactSettingsSchema = z.object({
  email: z.union([emailSchema, z.literal("")]),
  phone: z.string().trim().max(30),
  address: z.string().trim().max(300),
  legalName: z.string().trim().max(160),
  siret: z
    .string()
    .trim()
    .regex(/^(\d{14})?$/, "SIRET : 14 chiffres"),
});

export const seoSettingsSchema = z.object({
  title: z.string().trim().min(1).max(70),
  description: z.string().trim().min(1).max(170),
});

// ── Médias ────────────────────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const mediaMetaSchema = z.object({
  alt_text: z.string().trim().max(250),
  folder: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,40}$/)
    .default("general"),
});
