import type { NextConfig } from "next";

const config: NextConfig = {
  basePath: "/admin",
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@vaeloria/ui", "@vaeloria/config", "@vaeloria/types"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Cache-Control", value: "no-store" }] }];
  },
};

export default config;
