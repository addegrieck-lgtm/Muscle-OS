import Link from "next/link";
import { LogoSymbol, Tagline, Wordmark } from "@/components/brand/Logo";
import { FOOTER_NAV } from "@/lib/navigation";
import { getContactSettings } from "@/lib/services/content";
import { CookieSettingsButton } from "./CookieConsent";

export async function Footer() {
  const contact = await getContactSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-noir text-ivoire">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(168,138,98,0.22),transparent_65%)]" />
      <div className="container-luxe relative pb-10 pt-20 md:pt-28">
        <div className="flex flex-col items-center text-center">
          <LogoSymbol className="h-20 w-20 md:h-24 md:w-24" />
          <Wordmark className="mt-6 h-6 w-auto text-ivoire md:h-8" />
          <Tagline className="mt-4 h-2 w-auto text-champagne md:h-2.5" />
        </div>

        <div className="mt-20 grid gap-12 border-t border-ivoire/10 pt-14 sm:grid-cols-2 lg:grid-cols-4">
          <FooterCol title="La Maison" links={FOOTER_NAV.maison} />
          <FooterCol title="Collections" links={FOOTER_NAV.collections} />
          <FooterCol title="Service" links={FOOTER_NAV.service} />
          <div>
            <h2 className="t-eyebrow text-champagne">Nous écrire</h2>
            <div className="t-small mt-6 space-y-2 text-ivoire/70">
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="link-underline">
                  {contact.email}
                </a>
              ) : (
                <Link href="/contact" className="link-underline">
                  Formulaire de contact
                </Link>
              )}
              {contact.phone && <p>{contact.phone}</p>}
              <p className="pt-4 text-ivoire/50">
                Réseaux sociaux : ouverture des comptes officiels à venir.
              </p>
            </div>
          </div>
        </div>

        <div className="t-small mt-16 flex flex-col gap-4 border-t border-ivoire/10 pt-8 text-ivoire/45 md:flex-row md:items-center md:justify-between">
          <p>© {year} LUMÉANCE — L’art de révéler la lumière.</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/mentions-legales" className="hover:text-ivoire">
              Mentions légales
            </Link>
            <Link href="/confidentialite" className="hover:text-ivoire">
              Confidentialité
            </Link>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="t-eyebrow text-champagne">{title}</h2>
      <ul className="mt-6 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="t-small link-underline text-ivoire/75 hover:text-ivoire">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
