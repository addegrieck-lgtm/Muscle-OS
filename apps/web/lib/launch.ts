import { LAUNCH, type LaunchStage } from "@vaeloria/config";

/**
 * Stade du projet (voir LAUNCH dans @vaeloria/config). NEXT_PUBLIC_LAUNCH_STAGE permet de
 * le forcer au build sans toucher au code (ex. publier la version « open » le jour J).
 */
const fromEnv = process.env.NEXT_PUBLIC_LAUNCH_STAGE;
export const STAGE: LaunchStage = fromEnv === "prelaunch" || fromEnv === "beta" || fromEnv === "open" ? fromEnv : LAUNCH.stage;
export const IS_OPEN = STAGE === "open";
export const OPENING_DATE = LAUNCH.openingDate;

export const STAGE_LABEL: Record<LaunchStage, string> = {
  prelaunch: "En développement",
  beta: "Bêta fermée en cours",
  open: "Serveur ouvert",
};

/** Phrase courte et exacte sur l'état du projet, réutilisée par le bandeau, l'accueil et la FAQ. */
export const STAGE_SENTENCE: Record<LaunchStage, string> = {
  prelaunch: "VÆLORIA est en développement : le serveur n'est pas encore ouvert. La date d'ouverture sera annoncée sur Discord.",
  beta: "VÆLORIA est en bêta fermée : seuls les testeurs retenus peuvent se connecter. L'ouverture publique sera annoncée sur Discord.",
  open: "VÆLORIA est ouvert : connecte-toi en Minecraft Java 1.21.",
};

interface Cta {
  href: string;
  label: string;
  id: string;
}

/** Appels à l'action selon le stade : on ne pousse jamais « Jouer » avant l'ouverture réelle. */
export const CTA: Record<LaunchStage, { primary: Cta; secondary: Cta }> = {
  prelaunch: {
    primary: { href: "/discord", label: "Rejoindre le Discord", id: "discord" },
    secondary: { href: "/beta", label: "Candidater à la bêta", id: "beta" },
  },
  beta: {
    primary: { href: "/beta", label: "Candidater aux tests", id: "beta" },
    secondary: { href: "/discord", label: "Rejoindre le Discord", id: "discord" },
  },
  open: {
    primary: { href: "/jouer", label: "Jouer maintenant", id: "jouer" },
    secondary: { href: "/discord", label: "Rejoindre le Discord", id: "discord" },
  },
};

export const STAGE_CTA = CTA[STAGE];
