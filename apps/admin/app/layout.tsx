import type { Metadata } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import { Shell } from "@/components/Shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-chakra" });

export const metadata: Metadata = { title: "VÆLORIA — Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${chakra.variable}`}>
      <body className="min-h-dvh">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
