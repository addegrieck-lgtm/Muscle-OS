import Link from "next/link";
import { buttonClass } from "@vaeloria/ui";
import { IS_OPEN, STAGE_CTA, STAGE_LABEL, STAGE } from "@/lib/launch";
import { CopyIp } from "./CopyIp";

/**
 * Barre fixe mobile (trafic TikTok/Instagram). Serveur ouvert : l'IP et « Jouer ».
 * Avant l'ouverture : l'état réel du projet et l'action utile (Discord ou bêta), jamais une IP injoignable.
 */
export function MobilePlayBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
      <div className="flex items-center gap-2">
        {IS_OPEN ? (
          <>
            <CopyIp compact className="min-w-0 flex-1 justify-between" />
            <Link href="/jouer" data-track="click_play" className={buttonClass("primary", "md", "shrink-0")}>
              Jouer
            </Link>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-xs leading-tight text-muted">
              <span className="block font-display font-semibold uppercase tracking-[0.08em] text-fg">{STAGE_LABEL[STAGE]}</span>
              Ouverture annoncée sur Discord
            </p>
            <Link href={STAGE_CTA.primary.href} data-track="cta_click" data-track-id={`barre-${STAGE_CTA.primary.id}`} className={buttonClass("primary", "md", "shrink-0")}>
              {STAGE_CTA.primary.id === "beta" ? "Candidater" : "Discord"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
