import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { ContactSettings, HomeContent, ShippingSettings } from "@/types/catalog";

export const DEFAULT_HOME: HomeContent = {
  heroTitle: "LUMÉANCE",
  heroSignature: "L’art de révéler la lumière.",
  heroText: "Des créations lumineuses pensées pour sublimer les espaces.",
  manifestoTitle: "La lumière est une matière.",
  manifestoText:
    "Chez LUMÉANCE, un luminaire n’est jamais un simple objet fonctionnel. C’est une présence. Il dessine l’espace, révèle les volumes, réchauffe la pierre et le bois, et donne à chaque pièce son atmosphère. Nous sélectionnons des créations sculpturales, en verre, en cristal et en métal, pensées pour devenir le cœur d’un intérieur.",
  immersiveQuote: "La lumière devient architecture.",
  newsletterTitle: "Entrez dans l’univers LUMÉANCE.",
};

export const DEFAULT_SHIPPING: ShippingSettings = {
  standardAmount: 0,
  freeThreshold: 0,
  deliveryNote:
    "Délais communiqués pour chaque pièce après vérification auprès du fournisseur et du transporteur.",
  countries: ["FR"],
};

export const DEFAULT_CONTACT: ContactSettings = {
  email: "",
  phone: "",
  address: "",
  legalName: "",
  siret: "",
};

const getPublicSettings = cache(async (): Promise<Record<string, unknown>> => {
  if (!isSupabaseConfigured()) return {};
  const { data, error } = await createSupabasePublicClient()
    .from("site_settings")
    .select("setting_key, setting_value")
    .eq("is_public", true);
  if (error) {
    console.error("Réglages publics indisponibles :", error.message);
    return {};
  }
  return Object.fromEntries(data.map((r) => [r.setting_key, r.setting_value]));
});

async function setting<T extends object>(key: string, fallback: T): Promise<T> {
  const value = (await getPublicSettings())[key];
  return value && typeof value === "object" ? { ...fallback, ...(value as Partial<T>) } : fallback;
}

export const getHomeContent = () => setting("content.home", DEFAULT_HOME);
export const getShippingSettings = () => setting("shop.shipping", DEFAULT_SHIPPING);
export const getContactSettings = () => setting("shop.contact", DEFAULT_CONTACT);
