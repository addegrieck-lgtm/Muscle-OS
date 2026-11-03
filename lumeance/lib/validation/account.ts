import { z } from "zod";

/** Contrôle de clé (Luhn) d'un SIRET ; exception : établissements de La Poste (356 000 000). */
export function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  if (siret.startsWith("356000000")) {
    return siret.split("").reduce((s, d) => s + Number(d), 0) % 5 === 0;
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(siret[13 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const email = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254);
export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum")
  .max(200)
  .regex(/[A-Za-zÀ-ÿ]/, "Au moins une lettre")
  .regex(/\d/, "Au moins un chiffre");
const name = (label: string) => z.string().trim().min(1, `Indiquez votre ${label}`).max(80);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const signupSchema = z
  .object({
    account_type: z.enum(["particulier", "entreprise"]),
    first_name: name("prénom"),
    last_name: name("nom"),
    email,
    password: passwordSchema,
    phone: optional(30),
    company_name: optional(160),
    siret: z
      .string()
      .optional()
      .transform((v) => (v ? v.replace(/\s/g, "") : null)),
    vat_number: z
      .string()
      .optional()
      .transform((v) => (v ? v.replace(/\s/g, "").toUpperCase() : null)),
    referral: z
      .string()
      .optional()
      .transform((v) => (v ? v.trim().toUpperCase() : null)),
    newsletter: z.literal("on").optional(),
    terms: z.literal("on", { message: "Merci d’accepter les conditions" }),
    website: z.string().max(0).optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.account_type !== "entreprise") return;
    if (!d.company_name || d.company_name.length < 2)
      ctx.addIssue({
        code: "custom",
        path: ["company_name"],
        message: "Indiquez la raison sociale",
      });
    if (!d.siret || !isValidSiret(d.siret))
      ctx.addIssue({ code: "custom", path: ["siret"], message: "SIRET invalide (14 chiffres)" });
    if (d.vat_number && !/^[A-Z]{2}[A-Z0-9]{2,13}$/.test(d.vat_number))
      ctx.addIssue({ code: "custom", path: ["vat_number"], message: "Numéro de TVA invalide" });
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = z.object({ email, password: z.string().min(1).max(200) });
export const resetSchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Les deux saisies diffèrent",
  });
