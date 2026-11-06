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
 * Cloudflare Web Analytics (injecté par Cloudflare, sans cookie) : static.cloudflareinsights.com
 * (script), cloudflareinsights.com (envois).
 * Balise Pinterest (après consentement) : s.pinimg.com (script principal), ct.pinterest.com
 * (script complémentaire, cadre de mesure et envois).
 * Paiement : Stripe Checkout (page hébergée par Stripe) ; seule la redirection vers
 * checkout.stripe.com est autorisée (form-action, pour la redirection après envoi du formulaire).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://s.pinimg.com https://ct.pinterest.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://ct.pinterest.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ct.pinterest.com https://s.pinimg.com https://cloudflareinsights.com",
  "frame-src https://ct.pinterest.com",
  "worker-src 'self' blob:",
  "media-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
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
    // Versions réduites générées à la construction (voir lib/image-loader.ts).
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    deviceSizes: [640, 828, 1080, 1200, 1600, 1920],
    imageSizes: [96, 128, 256, 384],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ],
  },
  // Domaine canonique : www.maisonlumeance.fr → maisonlumeance.fr (301).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.maisonlumeance.fr" }],
        destination: "https://maisonlumeance.fr/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
