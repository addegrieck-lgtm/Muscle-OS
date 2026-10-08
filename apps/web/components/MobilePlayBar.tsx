import Link from "next/link";
import { buttonClass } from "@vaeloria/ui";
import { CopyIp } from "./CopyIp";

/** Barre fixe mobile : « Jouer » et l'IP toujours à portée de pouce (trafic TikTok/Instagram). */
export function MobilePlayBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
      <div className="flex items-center gap-2">
        <CopyIp compact className="min-w-0 flex-1 justify-between" />
        <Link href="/jouer" data-track="click_play" className={buttonClass("primary", "md", "shrink-0")}>
          Jouer
        </Link>
      </div>
    </div>
  );
}
