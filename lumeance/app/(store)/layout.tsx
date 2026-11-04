import { AccountProvider } from "@/components/account/AccountProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { WishlistProvider } from "@/components/wishlist/WishlistProvider";
import { PinterestTag } from "@/components/analytics/PinterestTag";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { PageViewBeacon } from "@/components/layout/PageViewBeacon";
import { isDemoCatalog } from "@/lib/services/catalog";
import { checkoutAvailable } from "@/lib/payments";
import { organizationJsonLd, jsonLdScript, websiteJsonLd } from "@/lib/seo/jsonld";

// Pages rendues à chaque requête : un produit publié depuis l'administration apparaît aussitôt,
// sans dépendre d'un cache de pages persistant (absent sur Cloudflare Workers).
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountProvider>
      <CartProvider>
        <WishlistProvider>
          <a
            href="#contenu"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-noir focus:px-4 focus:py-2 focus:text-ivoire"
          >
            Aller au contenu
          </a>
          <Header
            banner={
              isDemoCatalog() ? (
                <DemoBanner />
              ) : !checkoutAvailable() ? (
                <DemoBanner variant="preparation" />
              ) : undefined
            }
          />
          <main id="contenu">{children}</main>
          <Footer />
          <CookieConsent />
          <PinterestTag />
          <MotionRoot />
          <PageViewBeacon />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: jsonLdScript([organizationJsonLd(), websiteJsonLd()]),
            }}
          />
        </WishlistProvider>
      </CartProvider>
    </AccountProvider>
  );
}
