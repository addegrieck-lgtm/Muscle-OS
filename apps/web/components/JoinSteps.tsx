import Link from "next/link";
import { BRAND } from "@vaeloria/config";
import { Card } from "@vaeloria/ui";
import { IS_OPEN, STAGE } from "@/lib/launch";
import { CopyIp } from "./CopyIp";

const OPEN_STEPS = [
  { title: "Lance Minecraft Java", body: `Version ${BRAND.minecraftVersion}. Pas besoin de mod ni de launcher spécial.` },
  { title: "Ajoute le serveur", body: "Multijoueur → Ajouter un serveur → colle l'IP ci-dessous." },
  { title: "Rejoins le combat", body: "Crée ta faction ou rejoins-en une. Le spawn t'explique le reste." },
];

/** Avant l'ouverture, les étapes réellement possibles aujourd'hui. */
const PRE_STEPS = [
  { title: "Rejoins le Discord", body: "Annonces, journal de développement, date d'ouverture et recrutement des factions.", href: "/discord" },
  { title: STAGE === "beta" ? "Candidate aux tests" : "Candidate à la bêta", body: "Les testeurs aident à régler le PvP, l'économie et les raids avant l'ouverture.", href: "/beta" },
  { title: "Prépare ta faction", body: `Minecraft Java ${BRAND.minecraftVersion}, sans mod. Lis les guides et forme ton équipe.`, href: "/guides" },
];

export function JoinSteps() {
  const steps = IS_OPEN ? OPEN_STEPS : PRE_STEPS;
  return (
    <div id="jouer" className="scroll-mt-24">
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full">
              <p className="font-display text-sm font-bold text-accent">0{i + 1}</p>
              <p className="mt-2 font-semibold">{"href" in s ? <Link href={s.href as string} className="hover:text-accent">{s.title}</Link> : s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </Card>
          </li>
        ))}
      </ol>
      {IS_OPEN ? (
        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <CopyIp />
          <p className="text-sm text-subtle">Minecraft Java Edition {BRAND.minecraftVersion}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-subtle">L&apos;adresse du serveur sera publiée le jour de l&apos;ouverture. Minecraft Java Edition {BRAND.minecraftVersion}.</p>
      )}
    </div>
  );
}
