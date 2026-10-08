import { ErrorBox, H1 } from "@/components/Shell";
import { CrudList, WorldNav } from "@/components/WorldNav";
import { adminApi } from "@/lib/api";
import { VOTE_SITE } from "@/lib/worldFields";

export const dynamic = "force-dynamic";
type Stats = {
  bySite: { name: string; active: boolean; month: number; day: number; web: number; votifier: number }[];
  recent: { username: string; site: string; source: string; votedAt: string }[];
};

export default async function Page() {
  try {
    const [sites, stats] = await Promise.all([adminApi<{ items: Record<string, unknown>[] }>("/world/vote-sites"), adminApi<Stats>("/world/votes")]);
    return (
      <>
        <H1>Votes</H1>
        <WorldNav active="/world/votes" />
        <p className="mb-4 text-sm text-muted">
          Sites de classement affichés sur /vote. Un vote est compté une fois par site, par joueur et par délai, qu&apos;il arrive par le bouton « J&apos;ai voté » (vérification par IP auprès du site) ou par Votifier en jeu.
          Récompenses : influence (règle « Voter pour VÆLORIA » dans Influence) et commande en jeu facultative.
        </p>
        <div className="mb-6 overflow-x-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="text-left text-muted"><tr><th className="p-2">Site</th><th className="p-2">24 h</th><th className="p-2">Ce mois</th><th className="p-2">Via site</th><th className="p-2">Via Votifier</th></tr></thead>
            <tbody>
              {stats.bySite.map((s) => (
                <tr key={s.name} className="border-t border-line"><td className="p-2">{s.name}{s.active ? "" : " (masqué)"}</td><td className="p-2">{s.day}</td><td className="p-2">{s.month}</td><td className="p-2">{s.web}</td><td className="p-2">{s.votifier}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <CrudList path="vote-sites" back="/world/votes" rows={sites.items} pk="id" fields={VOTE_SITE} addLabel="Ajouter un site"
          title={(r) => <><strong>{String(r.name)}</strong> · {r.active ? "affiché" : "masqué"} · vérification {String(r.verifier)}{r.verifier !== "none" && !r.verification_key ? " (clé manquante)" : ""} · revote {String(r.cooldown_minutes)} min</>} />
        <h2 className="mb-2 mt-8 font-semibold">Derniers votes</h2>
        {stats.recent.length === 0 ? <p className="text-sm text-muted">Aucun vote pour l&apos;instant.</p> : (
          <ul className="space-y-1 text-sm">
            {stats.recent.map((v, i) => <li key={i}>{new Date(v.votedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · <strong>{v.username}</strong> · {v.site} · {v.source === "web" ? "site" : v.source}</li>)}
          </ul>
        )}
      </>
    );
  } catch (e) {
    return <><H1>Votes</H1><WorldNav active="/world/votes" /><ErrorBox message={(e as Error).message} /></>;
  }
}
