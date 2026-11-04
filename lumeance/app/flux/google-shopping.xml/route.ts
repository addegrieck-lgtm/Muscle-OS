import { siteUrl } from "@/lib/env";
import { merchantFeed } from "@/lib/seo/merchant-feed";
import { SITE_NAME } from "@/lib/seo/metadata";
import { getProducts } from "@/lib/services/catalog";
import { getShippingSettings } from "@/lib/services/content";

export const dynamic = "force-dynamic";

/** Flux Google Merchant Center (à déclarer dans Merchant Center une fois le paiement ouvert). */
export async function GET() {
  const [products, shipping] = await Promise.all([getProducts(), getShippingSettings()]);
  return new Response(merchantFeed(products, { siteUrl, brand: SITE_NAME, shipping }), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}
