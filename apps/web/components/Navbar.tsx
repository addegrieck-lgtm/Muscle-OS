"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LINKS } from "@vaeloria/config";
import { buttonClass, cn } from "@vaeloria/ui";
import { Wordmark } from "./Logo";
import { CartButton } from "./shop/CartButton";

export const NAV = [
  { href: "/jouer", label: "Jouer" },
  { href: "/monde", label: "Monde" },
  { href: "/empires", label: "Empires", match: ["/empire/"] },
  { href: "/guerres", label: "Guerres", match: ["/guerre/"] },
  { href: "/classements", label: "Classements" },
  { href: "/evenements", label: "Événements", match: ["/evenement/"] },
  { href: "/conseil", label: "Conseil" },
  { href: "/voter", label: "Voter" },
];

/** Menu mobile : la navigation principale, puis le reste du site. */
const MORE = [
  { href: "/fondateurs", label: "Fondateurs" },
  { href: "/boutique", label: "Boutique" },
  { href: "/factions", label: "Factions" },
  { href: "/economie", label: "Économie" },
  { href: "/pvp", label: "PvP" },
  { href: "/commandes", label: "Commandes" },
  { href: "/journal", label: "Journal" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/news", label: "News" },
  { href: "/guides", label: "Guides" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-contrast">
        Aller au contenu
      </a>
      <nav aria-label="Navigation principale" className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="VÆLORIA — accueil" className="shrink-0">
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || Boolean(item.match?.some((m) => pathname.startsWith(m)));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative whitespace-nowrap rounded-md px-2 py-2 font-display text-sm font-semibold uppercase tracking-[0.06em] transition-colors", active ? "text-fg after:absolute after:inset-x-2 after:-bottom-[13px] after:h-0.5 after:bg-ruby" : "text-muted hover:text-fg")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <CartButton />
          {/* Masqués sur mobile : le menu et la barre fixe du bas les portent déjà. */}
          <div className="hidden items-center gap-2 sm:flex">
            <Link href="/login" className={buttonClass("ghost", "sm")}>
              Connexion
            </Link>
            <Link href="/rejoindre" data-track="cta_click" data-track-id="nav-rejoindre" className={buttonClass("primary", "sm")}>
              Rejoindre
            </Link>
          </div>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-2 xl:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>
      {/* Hauteur explicite : le backdrop-filter du header devient le repère des éléments fixes. */}
      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-bg px-4 pb-28 pt-4 xl:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/rejoindre" data-track="cta_click" data-track-id="menu-rejoindre" className={buttonClass("primary", "lg")}>Rejoindre</Link>
            <Link href="/login" className={buttonClass("secondary", "lg")}>Connexion</Link>
          </div>
          <ul className="mt-4 flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} className="block border-b border-line/60 py-3.5 font-display text-lg font-semibold uppercase tracking-[0.06em] text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 grid grid-cols-2 gap-x-4">
            {MORE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block py-2.5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-muted hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" data-track="click_discord" className={buttonClass("secondary", "lg", "mt-6 w-full")}>
            Rejoindre le Discord
          </a>
        </div>
      )}
    </header>
  );
}
