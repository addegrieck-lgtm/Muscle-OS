import { BRAND } from "@vaeloria/config";
import { Card } from "@vaeloria/ui";
import { CopyIp } from "./CopyIp";

const STEPS = [
  { title: "Lance Minecraft Java", body: `Version ${BRAND.minecraftVersion}. Pas besoin de mod ni de launcher spécial.` },
  { title: "Ajoute le serveur", body: "Multijoueur → Ajouter un serveur → colle l'IP ci-dessous." },
  { title: "Rejoins le combat", body: "Crée ta faction ou rejoins-en une. Le spawn t'explique le reste." },
];

export function JoinSteps() {
  return (
    <div id="jouer" className="scroll-mt-24">
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full">
              <p className="font-display text-sm font-bold text-accent">0{i + 1}</p>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </Card>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <CopyIp />
        <p className="text-sm text-subtle">Minecraft Java Edition {BRAND.minecraftVersion}</p>
      </div>
    </div>
  );
}
