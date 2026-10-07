import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const config: NextConfig = {
  // Image Docker minimale (node server.js) — voir docs/SCALABILITY.md
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@vaeloria/ui", "@vaeloria/config", "@vaeloria/types", "@vaeloria/api-client"],
  poweredByHeader: false,
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
