import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { Wordmark } from "./Logo";

const COLS = [
  { title: "Le monde", links: [["/monde", "Carte"], ["/empires", "Empires"], ["/guerres", "Guerres"], ["/evenements", "Événements"], ["/classements", "Classements"], ["/fondateurs", "Fondateurs"]] },
  { title: "Communauté", links: [["/conseil", "Conseil"], ["/journal", "Journal"], ["/roadmap", "Roadmap"], ["/news", "News"], ["/creators", "Créateurs"], ["/discord", "Discord"]] },
  { title: "Jouer", links: [["/jouer", "Comment jouer"], ["/voter", "Voter"], ["/factions", "Factions"], ["/economie", "Économie"], ["/pvp", "PvP"], ["/commandes", "Commandes"], ["/guides", "Guides"], ["/boutique", "Boutique"]] },
  { title: "Aide", links: [["/faq", "FAQ"], ["/rules", "Règlement"], ["/support", "Support"], ["/status", "Statut"], ["/staff", "Staff"], ["/beta", "Bêta"]] },
  { title: "Légal", links: [["/mentions-legales", "Mentions légales"], ["/confidentialite", "Confidentialité"], ["/cookies", "Cookies"], ["/cgv", "CGV"], ["/contact", "Contact"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line pb-28 sm:pb-0">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-muted">{BRAND.description}</p>
          <div className="mt-4 flex gap-4 text-sm text-muted">
            <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" className="hover:text-fg" data-track="click_discord">Discord</a>
            <a href={LINKS.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-fg">TikTok</a>
            <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-fg">YouTube</a>
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-subtle">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-muted hover:text-fg">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line/60">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle sm:px-6">
          © {new Date().getFullYear()} {BRAND.name}. Serveur non officiel, non affilié à Mojang Studios ni à Microsoft.
        </p>
      </div>
    </footer>
  );
}
