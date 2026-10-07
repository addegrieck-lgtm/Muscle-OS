"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LINKS } from "@vaeloria/config";
import { buttonClass, cn } from "@vaeloria/ui";
import { Wordmark } from "./Logo";

export const NAV = [
  { href: "/pvp", label: "PvP" },
  { href: "/factions", label: "Factions" },
  { href: "/seasons", label: "Saison" },
  { href: "/leaderboards", label: "Classements" },
  { href: "/events", label: "Événements" },
  { href: "/news", label: "News" },
  { href: "/guides", label: "Guides" },
  { href: "/shop", label: "Boutique" },
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
        <Link href="/" aria-label="VÆLORIA — accueil">
          <Wordmark />
        </Link>
        <ul className="hidden items-center gap-0.5 xl:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative rounded-md px-3 py-2 font-display text-sm font-semibold uppercase tracking-[0.08em] transition-colors", active ? "text-fg after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-ruby" : "text-muted hover:text-fg")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          {/* Masqués sur mobile : la barre fixe du bas porte déjà « Jouer » et l'IP. */}
          <div className="hidden items-center gap-2 sm:flex">
            <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" data-track="click_discord" className={buttonClass("ghost", "sm")}>
              Discord
            </a>
            <Link href="/#jouer" data-track="click_play" className={buttonClass("primary", "sm")}>
              Jouer
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
      {open && (
        <div id="menu-mobile" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-line bg-bg px-4 pb-28 pt-4 xl:hidden">
          <ul className="flex flex-col">
            {[...NAV, { href: "/faq", label: "FAQ" }, { href: "/status", label: "Statut" }, { href: "/support", label: "Support" }, { href: "/account", label: "Mon compte" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block border-b border-line/60 py-3.5 font-display text-lg font-semibold uppercase tracking-[0.06em] text-fg">
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
