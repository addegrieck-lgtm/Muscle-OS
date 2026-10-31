import { CartProvider } from "@/components/cart/CartProvider";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { isDemoCatalog } from "@/lib/services/catalog";
import { organizationJsonLd, jsonLdScript } from "@/lib/seo/jsonld";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-noir focus:px-4 focus:py-2 focus:text-ivoire"
      >
        Aller au contenu
      </a>
      <Header banner={isDemoCatalog() ? <DemoBanner /> : undefined} />
      <main id="contenu">{children}</main>
      <Footer />
      <CookieConsent />
      <MotionRoot />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }}
      />
    </CartProvider>
  );
}
