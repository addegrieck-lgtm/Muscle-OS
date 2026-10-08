"use client";

import { useCallback, useEffect, useState } from "react";
import type { MyServerVotes, VoteSiteView } from "@vaeloria/types";
import { Badge, Button, ButtonLink, Card, formatDateTime } from "@vaeloria/ui";
import { loginHref, useMyWorld, worldAction } from "@/lib/world/useMyWorld";
import { track } from "@/lib/track";

const every = (min: number) => (min % 60 === 0 ? `${min / 60} h` : min > 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`);

/** Liste des sites de vote : lien vers le site, puis confirmation « J'ai voté » vérifiée par l'API. */
export function VoteSites({ sites }: { sites: VoteSiteView[] }) {
  const [world] = useMyWorld();
  const [mine, setMine] = useState<MyServerVotes | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({});

  const load = useCallback(() => {
    fetch("/api/world/server-votes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMine(d && !d.anonymous ? d : null))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (world.status === "ready") load();
  }, [world.status, load]);

  async function claim(site: VoteSiteView) {
    setBusy(site.key);
    const r = await worldAction(`server-votes/${site.key}/claim`, {});
    setBusy(null);
    if (r.ok) {
      const gained = (r.data as { influence?: number }).influence ?? 0;
      setMsg((m) => ({ ...m, [site.key]: { ok: true, text: `Vote comptabilisé${gained ? ` · +${gained} influence` : ""}. Ta récompense t'attend en jeu.` } }));
    } else {
      setMsg((m) => ({ ...m, [site.key]: { ok: false, text: r.error } }));
    }
    load();
  }

  const linked = world.status === "ready" && world.data.linked;
  return (
    <div className="space-y-4">
      {world.status === "anonymous" && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-ruby/40">
          <p className="text-sm">Connecte-toi et lie ton compte Minecraft pour recevoir tes récompenses de vote.</p>
          <ButtonLink href={loginHref("/vote")} size="sm">Se connecter</ButtonLink>
        </Card>
      )}
      {world.status === "ready" && !linked && (
        <Card className="text-sm">Dernière étape : <a href="/compte" className="underline">lie ton compte Minecraft</a> (tape <code>/link</code> en jeu) pour que tes votes soient récompensés.</Card>
      )}
      {mine?.player && <p className="text-sm text-muted">Tu votes en tant que <strong className="text-fg">{mine.player.username}</strong> · {mine.monthVotes} vote(s) ce mois-ci.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => {
          const next = mine?.sites.find((x) => x.key === s.key)?.nextAt ?? null;
          const m = msg[s.key];
          return (
            <Card key={s.key} className="flex flex-col gap-4">
              <div>
                <h3 className="font-display text-lg font-bold uppercase tracking-[0.04em]">{s.name}</h3>
                <p className="mt-1 text-xs text-subtle">Un vote toutes les {every(s.cooldownMinutes)}</p>
                {s.rewardLabel && <Badge className="mt-3">{s.rewardLabel}</Badge>}
              </div>
              <div className="mt-auto space-y-2">
                {next ? (
                  <p className="text-sm text-muted">Prochain vote : <strong className="text-fg">{formatDateTime(next)}</strong></p>
                ) : (
                  <ButtonLink href={s.voteUrl} external className="w-full" onClick={() => track("server_vote_open", { site: s.key })}>Voter</ButtonLink>
                )}
                {s.verifiable && linked && !next && (
                  <Button variant="secondary" className="w-full" onClick={() => claim(s)} disabled={busy !== null}>{busy === s.key ? "Vérification…" : "J'ai voté"}</Button>
                )}
                {!s.verifiable && <p className="text-xs text-subtle">Comptabilisé automatiquement en jeu.</p>}
                {m && <p role={m.ok ? "status" : "alert"} className={`text-sm ${m.ok ? "text-success" : "text-danger"}`}>{m.text}</p>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
