import type { Metadata, Viewport } from "next";
import { cormorant, manrope } from "./fonts";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/metadata";
import { publicEnv, siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — Luminaires design haut de gamme`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: publicEnv.NEXT_PUBLIC_INDEXABLE ? undefined : { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1ECE4" },
    { media: "(prefers-color-scheme: dark)", color: "#191817" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Active les états initiaux des animations seulement si JS est disponible et que le
            mouvement n'est pas réduit : sans JS, tout le contenu reste visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-motion')}catch(e){}" +
              INTRO_BOOT_SCRIPT,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
