"use client";

import { useState, type ReactNode } from "react";
import { buttonClass } from "@vaeloria/ui";

/** Onglets côté client : tout le contenu est rendu (et mis en cache) côté serveur. */
export function Tabs({ tabs, label }: { tabs: { id: string; label: string; content: ReactNode }[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div role="tablist" aria-label={label} className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" id={`tab-${t.id}`} aria-selected={t.id === active} aria-controls={`panel-${t.id}`} onClick={() => setActive(t.id)} className={buttonClass(t.id === active ? "primary" : "secondary", "sm", "shrink-0")}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={t.id !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
