import type { Metadata } from "next";
import { publicEnv, siteUrl } from "@/lib/env";

export const SITE_NAME = "LUMÉANCE";
export const SITE_SIGNATURE = "L’art de révéler la lumière.";
export const DEFAULT_DESCRIPTION =
  "Maison française de luminaires design haut de gamme : lustres monumentaux, suspensions en verre et cristal, appliques et lampadaires sculpturaux.";

export function absoluteUrl(path = "/"): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const image = opts.image ?? absoluteUrl("/og-default.png");
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    robots:
      opts.noindex || !publicEnv.NEXT_PUBLIC_INDEXABLE
        ? { index: false, follow: !opts.noindex }
        : undefined,
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: SITE_NAME,
      url,
      title: opts.title,
      description: opts.description,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}
