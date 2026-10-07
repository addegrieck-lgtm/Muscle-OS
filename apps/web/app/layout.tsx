import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import { BRAND } from "@vaeloria/config";
import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { MobilePlayBar } from "@/components/MobilePlayBar";
import { Navbar } from "@/components/Navbar";
import { JsonLd, SITE_URL } from "@/lib/seo";
import "./globals.css";

// Polices auto-hébergées par Next au build : aucune requête vers Google côté visiteur (RGPD).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cinzel", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name} — Serveur Minecraft Faction & PvP français`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, locale: BRAND.locale, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0a0a0b", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="min-h-dvh">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: BRAND.name,
            url: SITE_URL,
            logo: `${SITE_URL}/icon.svg`,
            slogan: BRAND.tagline,
          }}
        />
        <Navbar />
        <main id="contenu">{children}</main>
        <Footer />
        <MobilePlayBar />
        <Analytics />
      </body>
    </html>
  );
}
