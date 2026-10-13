import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { BRAND } from "@vaeloria/config";
import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { MobilePlayBar } from "@/components/MobilePlayBar";
import { Navbar } from "@/components/Navbar";
import { CartProvider } from "@/components/shop/cart";
import Link from "next/link";
import { IS_OPEN, STAGE, STAGE_SENTENCE } from "@/lib/launch";
import { INDEXABLE } from "@/lib/preview";
import { JsonLd, OG_IMAGE, SITE_URL } from "@/lib/seo";
import "./globals.css";

// Polices auto-hébergées par Next au build : aucune requête vers Google côté visiteur (RGPD).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Chakra Petch : angles coupés, écho direct du O octogonal et des facettes du logotype.
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-chakra", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} — Serveur Minecraft Faction & PvP français`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, locale: BRAND.locale, type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [OG_IMAGE.url] },
  ...(INDEXABLE ? {} : { robots: { index: false, follow: false } }),
  // Google Search Console (propriété « préfixe d'URL ») : jeton fourni par la console, sans le contenu de la balise.
  ...(process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { verification: { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } } : {}),
};

// Cloudflare Web Analytics : mesure d'audience sans cookie ni donnée personnelle, activée seulement si un jeton est fourni.
const CF_BEACON = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

export const viewport: Viewport = { themeColor: "#07070a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${chakra.variable}`}>
      <body className="min-h-dvh">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: BRAND.name,
            url: SITE_URL,
            logo: `${SITE_URL}/brand/valoria-symbole.svg`,
            slogan: BRAND.tagline,
          }}
        />
        {!IS_OPEN && (
          <p className="border-b border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-accent">
            {STAGE_SENTENCE[STAGE]}{" "}
            <Link href="/discord" className="font-semibold underline underline-offset-2" data-track="click_discord" data-track-id="bandeau">Suivre le développement</Link>
          </p>
        )}
        <CartProvider>
          <Navbar />
          <main id="contenu">{children}</main>
          <Footer />
          <MobilePlayBar />
        </CartProvider>
        <Analytics />
        {CF_BEACON && <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon={JSON.stringify({ token: CF_BEACON })} />}
      </body>
    </html>
  );
}
