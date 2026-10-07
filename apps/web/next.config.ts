import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/**
 * Deux modes de build :
 * - normal : serveur Next (production réelle).
 * - aperçu (NEXT_PUBLIC_PREVIEW=1) : export HTML statique pour GitHub Pages.
 *
 * Les fichiers de route qui exigent un serveur (server actions, route POST, profils
 * dynamiques) sont nommés `*.full.tsx|ts` ; leurs remplaçants statiques `*.preview.tsx`.
 * `pageExtensions` sélectionne l'une ou l'autre série selon le mode.
 */
const preview = process.env.NEXT_PUBLIC_PREVIEW === "1";
const basePath = process.env.PREVIEW_BASE_PATH ?? "";

const shared: NextConfig = {
  transpilePackages: ["@vaeloria/ui", "@vaeloria/config", "@vaeloria/types", "@vaeloria/api-client"],
  poweredByHeader: false,
};

const config: NextConfig = preview
  ? {
      ...shared,
      output: "export",
      basePath,
      trailingSlash: true,
      pageExtensions: ["tsx", "ts", "preview.tsx", "preview.ts"],
      images: { unoptimized: true },
    }
  : {
      ...shared,
      // Image Docker minimale (node server.js) — voir docs/SCALABILITY.md
      output: "standalone",
      outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
      pageExtensions: ["tsx", "ts", "full.tsx", "full.ts"],
      images: {
        formats: ["image/avif", "image/webp"],
        remotePatterns: [{ protocol: "https", hostname: "mc-heads.net" }],
      },
      async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
      },
      async redirects() {
        return [
          { source: "/leaderboard", destination: "/leaderboards", permanent: true },
          { source: "/classement", destination: "/leaderboards", permanent: true },
          { source: "/season", destination: "/seasons", permanent: true },
        ];
      },
    };

export default config;
