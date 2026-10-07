"use client";

import { useEffect, useState } from "react";
import { Button } from "@vaeloria/ui";
import { analyticsDisabled, setAnalyticsOptOut } from "@/lib/track";

export function AnalyticsOptOut() {
  const [disabled, setDisabled] = useState<boolean | null>(null);
  useEffect(() => setDisabled(analyticsDisabled()), []);
  if (disabled === null) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-line p-4">
      <p className="text-sm">Mesure d&apos;audience : <strong>{disabled ? "désactivée" : "activée"}</strong></p>
      <Button variant="secondary" size="sm" onClick={() => { setAnalyticsOptOut(!disabled); setDisabled(!disabled); }}>
        {disabled ? "Réactiver" : "Désactiver"}
      </Button>
    </div>
  );
}
