"use client";

import { useState } from "react";
import type { PollView } from "@vaeloria/types";
import { Button, ButtonLink, cn } from "@vaeloria/ui";
import { PollResults } from "@/components/world/PollPreview";
import { loginHref, useMyWorld, worldAction } from "@/lib/world/useMyWorld";

/** Vote au Conseil : un vote par compte, définitif. Les résultats affichés viennent du cache serveur. */
export function CouncilVote({ poll }: { poll: PollView }) {
  const [state, reload] = useMyWorld();
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justVoted, setJustVoted] = useState<string | null>(null);

  const voted = justVoted ?? (state.status === "ready" ? state.data.votes[poll.slug] ?? null : null);
  if (poll.status !== "open" || voted || state.status !== "ready") {
    return (
      <div className="space-y-4">
        <PollResults poll={poll} highlight={voted} />
        {justVoted && <p role="status" className="text-sm text-success">Vote enregistré. Les résultats s&apos;actualisent sous quelques secondes.</p>}
        {poll.status === "open" && state.status === "anonymous" && <ButtonLink href={loginHref("/conseil")}>Se connecter pour voter</ButtonLink>}
      </div>
    );
  }
  const needsLink = poll.eligibility === "linked" && !state.data.linked;

  async function vote() {
    if (!choice) return;
    setBusy(true);
    setError(null);
    const r = await worldAction("vote", { slug: poll.slug, optionId: choice });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setJustVoted(choice);
    reload();
  }

  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{poll.question}</legend>
      {poll.options.map((o) => (
        <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3", choice === o.id ? "border-ruby bg-ruby/10" : "border-line hover:border-line-strong")}>
          <input type="radio" name={`poll-${poll.slug}`} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="accent-[var(--color-ruby)]" />
          <span className="font-semibold">{o.label}</span>
        </label>
      ))}
      {needsLink && <p className="text-sm text-warning">Ce vote est réservé aux comptes liés à Minecraft (<a href="/compte" className="underline">lier mon compte</a>).</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button onClick={vote} disabled={!choice || busy || needsLink}>{busy ? "Vote…" : "Voter"}</Button>
      <p className="text-xs text-subtle">Un seul vote par compte, définitif.</p>
    </fieldset>
  );
}
