import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

// Hôte des images : celui du projet si connu au build, sinon tout projet Supabase hébergé
// (les variables peuvent n'être fournies qu'à l'exécution, par exemple sur Cloudflare).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/**
 * Politique de sécurité du contenu (production uniquement : le mode développement de Next a besoin
 * d'eval). Tout est servi par le site lui-même, sauf les images et l'API Supabase.
 * 'unsafe-inline' reste nécessaire pour les scripts : Next.js et le script d'intro sont injectés
 * en ligne (passer à des nonces imposerait un middleware sur toutes les pages).
 * À compléter si un service tiers est ajouté (mesure d'audience, paiement Stripe : js.stripe.com…).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "media-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({ key: "Content-Security-Policy", value: contentSecurityPolicy });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Projet autonome dans le dépôt Muscle-OS : la racine de traçage est ce dossier.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  poweredByHeader: false,
  // Import d'images (10 Mo max, contrôlé côté serveur) via les actions d'administration.
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
