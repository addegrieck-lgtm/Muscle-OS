"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoSymbol, Wordmark } from "@/components/brand/Logo";
import { useCart } from "@/components/cart/CartProvider";
import { MAIN_NAV } from "@/lib/navigation";
import { MobileMenu } from "./MobileMenu";

/** Pages dont le haut est une scène sombre : l'en-tête y démarre en version claire. */
const DARK_TOP = ["/", "/maison"];

export function Header({ banner }: { banner?: React.ReactNode }) {
  const pathname = usePathname();
  const { count, ready, lastAdded } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 400 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!lastAdded) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1200);
    return () => clearTimeout(t);
  }, [lastAdded]);

  const onDark = DARK_TOP.includes(pathname) && !scrolled;
  const tone = onDark ? "text-ivoire" : "text-brun";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow] duration-700 ease-[var(--ease-luxe)] ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "bg-ivoire/90 shadow-[0_1px_0_rgba(68,55,46,0.08)] backdrop-blur-md" : "bg-transparent"}`}
      >
        {banner && (
          <div
            className={`overflow-hidden transition-[max-height] duration-700 ${scrolled ? "max-h-0" : "max-h-24"}`}
          >
            {banner}
          </div>
        )}
        <div className={`container-luxe flex h-16 items-center justify-between md:h-20 ${tone}`}>
          <Link href="/" className="flex items-center gap-3" aria-label="LUMÉANCE — accueil">
            <LogoSymbol className="h-9 w-9 md:h-10 md:w-10" />
            <Wordmark className="h-[0.85rem] w-auto md:h-4" />
          </Link>

          <nav aria-label="Navigation principale" className="hidden xl:block">
            <ul className="flex items-center gap-8">
              {MAIN_NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/collections" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`t-eyebrow link-underline pb-1 ${active ? "opacity-100" : "opacity-75 hover:opacity-100"}`}
                      aria-current={active ? "page" : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/panier"
              className="t-eyebrow relative flex items-center gap-2"
              aria-label={`Panier${ready && count ? `, ${count} article${count > 1 ? "s" : ""}` : ""}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                aria-hidden
              >
                <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
              <span className="hidden sm:inline">Panier</span>
              {ready && count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-champagne px-1 text-[0.65rem] tracking-normal text-ivoire transition-transform duration-500 ${
                    pulse ? "scale-125" : "scale-100"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 flex-col items-center justify-center gap-[7px] xl:hidden"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={open}
              aria-controls="menu-mobile"
              onClick={() => setOpen((v) => !v)}
            >
              <span
                className={`block h-px w-7 bg-current transition-transform duration-500 ${open ? "translate-y-[4px] rotate-45" : ""}`}
              />
              <span
                className={`block h-px w-7 bg-current transition-transform duration-500 ${open ? "-translate-y-[4px] -rotate-45" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
