"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogoSymbol } from "@/components/brand/Logo";
import { MAIN_NAV } from "@/lib/navigation";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      id="menu-mobile"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      inert={!open}
      className={`fixed inset-0 z-40 overflow-y-auto bg-noir text-ivoire transition-[clip-path] duration-[900ms] ease-[var(--ease-luxe)] xl:hidden ${
        open ? "[clip-path:inset(0_0_0_0)]" : "pointer-events-none [clip-path:inset(0_0_100%_0)]"
      }`}
    >
      <div className="pointer-events-none absolute -right-24 top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(233,196,140,0.18),transparent_65%)]" />
      <nav
        aria-label="Navigation mobile"
        className="container-luxe flex min-h-full flex-col pb-10 pt-28"
      >
        <ul className="space-y-1">
          {MAIN_NAV.map((item, i) => (
            <li
              key={item.href}
              className="overflow-hidden"
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
            >
              <Link
                href={item.href}
                onClick={onClose}
                className={`block py-2 font-serif text-[2.4rem] font-light leading-tight transition-all duration-700 ease-[var(--ease-luxe)] sm:text-5xl ${
                  open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: open ? `${150 + i * 60}ms` : "0ms" }}
              >
                <span className="mr-4 align-middle font-sans text-[0.65rem] tracking-[0.3em] text-champagne">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end justify-between pt-12">
          <div className="t-small space-y-2 text-ivoire/60">
            <Link href="/contact" onClick={onClose} className="block hover:text-ivoire">
              Contact
            </Link>
            <Link href="/livraison" onClick={onClose} className="block hover:text-ivoire">
              Livraison et retours
            </Link>
          </div>
          <LogoSymbol className="h-16 w-16 opacity-80" />
        </div>
      </nav>
    </div>
  );
}
