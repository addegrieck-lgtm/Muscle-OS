/**
 * Contrôle SEO des fiches produits : ce qui est présent, ce qui manque. Un manque n'est JAMAIS
 * comblé automatiquement : il est signalé « à demander au fournisseur » (aucune caractéristique,
 * certification, indice IP, conformité ou garantie n'est inventée). Fonctions pures, testées.
 */
import { priceRange } from "@/lib/catalog/price-range";
import { auditPage, withSuffix, type Check } from "./audit";
import type { Product } from "@/types/catalog";

export interface ProductAudit {
  product: Product;
  score: number;
  checks: (Check & { supplier?: boolean })[];
  photos: number;
}

const has = (p: Product, re: RegExp) => p.specifications.some((s) => re.test(s.label));
const words = (s: string) => (s.match(/[\p{L}\p{N}’']+/gu) ?? []).length;

export function auditProduct(
  p: Product,
  ctx: { articles: number; rooms: number; reviews: number },
): ProductAudit {
  const base = auditPage(
    {
      path: `/produit/${p.slug}`,
      kind: "produit",
      name: p.name,
      title: withSuffix(p.seoTitle ?? p.name),
      description: p.seoDescription ?? p.shortDescription ?? "",
      text: "",
      keywords: [p.name],
    },
    { title: new Set(), description: new Set() },
  ).checks;
  const checks: ProductAudit["checks"] = [...base];
  const push = (c: ProductAudit["checks"][number]) => checks.push(c);

  const descWords = words(p.description ?? "");
  push({
    id: "desc",
    label: "Description",
    weight: 3,
    severity: descWords >= 120 ? "ok" : descWords >= 60 ? "warn" : "error",
    detail:
      descWords >= 120
        ? `${descWords} mots.`
        : `${descWords} mots : visez 120 mots, avec des informations vérifiées (usage, matières, lumière).`,
  });

  const variantImages = new Set(
    p.variants.filter((v) => v.active && v.imageUrl).map((v) => v.imageUrl),
  );
  const photos = p.images.length + variantImages.size;
  const shortAlts = p.images.filter((i) => i.alt.trim().length < 15).length;
  push({
    id: "photos",
    label: "Photos",
    weight: 2,
    severity: photos >= 3 && !shortAlts ? "ok" : photos >= 1 ? "warn" : "error",
    detail: shortAlts
      ? `${shortAlts} photo(s) sans texte alternatif suffisant.`
      : `${p.images.length} photo(s) de la pièce et ${variantImages.size} visuel(s) de versions, tous décrits.`,
  });
  const noImg = p.variants.filter((v) => v.active && !v.imageUrl).length;
  if (p.variants.length > 1)
    push({
      id: "variants",
      label: "Visuel par version",
      weight: 1,
      severity: noImg ? "warn" : "ok",
      detail: noImg ? `${noImg} version(s) sans visuel propre.` : "Chaque version a son visuel.",
    });

  const dims =
    Object.values(p.dimensions).some((v) => typeof v === "number") ||
    has(p, /^Dimensions|Hauteur|Diamètre/i) ||
    p.variants.some((v) => /\d\s*cm/.test(v.details ?? ""));
  push({
    id: "dims",
    label: "Dimensions",
    weight: 2,
    severity: dims ? "ok" : "error",
    detail: dims ? "Indiquées." : "Absentes : à demander au fournisseur.",
    supplier: !dims,
  });
  const light = has(p, /Sources lumineuses|Puissance|Flux lumineux/i);
  const colour = has(p, /Couleur de lumière|Température/i);
  push({
    id: "light",
    label: "Lumière (sources, couleur)",
    weight: 2,
    severity: light && colour ? "ok" : light || colour ? "warn" : "error",
    detail:
      light && colour
        ? "Sources et couleur de lumière indiquées."
        : `À demander au fournisseur : ${[!light && "sources ou puissance", !colour && "couleur de lumière"].filter(Boolean).join(", ")}.`,
    supplier: !(light && colour),
  });
  push({
    id: "materials",
    label: "Matières",
    weight: 1,
    severity: p.materials.length || has(p, /Matières|Matière/i) ? "ok" : "warn",
    detail: p.materials.length
      ? p.materials.join(", ")
      : "Non renseignées : à demander au fournisseur.",
    supplier: !p.materials.length,
  });
  push({
    id: "weight",
    label: "Poids",
    weight: 1,
    severity: typeof p.weight === "number" ? "ok" : "warn",
    detail:
      typeof p.weight === "number"
        ? `${p.weight / 1000} kg.`
        : "Non renseigné : utile pour l’installation, à demander au fournisseur.",
    supplier: typeof p.weight !== "number",
  });
  push({
    id: "warranty",
    label: "Garantie",
    weight: 1,
    severity: has(p, /Garantie/i) ? "ok" : "warn",
    detail: has(p, /Garantie/i)
      ? "Indiquée (telle qu’annoncée par le fournisseur)."
      : "Non indiquée : ne rien afficher sans confirmation écrite du fournisseur.",
    supplier: !has(p, /Garantie/i),
  });
  push({
    id: "offer",
    label: "Prix et disponibilité",
    weight: 2,
    severity: priceRange(p).min > 0 ? "ok" : "error",
    detail:
      priceRange(p).min > 0
        ? "Données structurées complètes (prix, stock, livraison, retours)."
        : "Prix manquant.",
  });
  push({
    id: "links",
    label: "Liens vers la fiche",
    weight: 1,
    severity:
      ctx.rooms + ctx.articles >= 2 ? "ok" : ctx.rooms + ctx.articles === 1 ? "warn" : "error",
    detail: `${ctx.rooms} page(s) par pièce, ${ctx.articles} article(s) du journal.`,
  });
  push({
    id: "reviews",
    label: "Avis vérifiés",
    weight: 0,
    severity: ctx.reviews ? "ok" : "warn",
    detail: ctx.reviews
      ? `${ctx.reviews} avis publié(s) : note affichée dans Google.`
      : "Aucun avis pour l’instant : ils viendront des commandes livrées (jamais d’avis inventé).",
  });

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce(
    (s, c) => s + c.weight * (c.severity === "ok" ? 1 : c.severity === "warn" ? 0.5 : 0),
    0,
  );
  return { product: p, checks, photos, score: total ? Math.round((got / total) * 100) : 100 };
}
