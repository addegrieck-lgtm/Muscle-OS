"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import type { Field } from "@/lib/resources";
import { saveWorld, type WorldFormState } from "@/lib/worldActions";

function toLocalInput(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initial(f: Field, row: Record<string, unknown> | null): string {
  const v = row?.[f.column ?? f.name];
  if (v === null || v === undefined) return "";
  if (f.kind === "datetime") return toLocalInput(v);
  if (f.kind === "lines") return (v as (string | { label: string })[]).map((x) => (typeof x === "string" ? x : x.label)).join("\n");
  return String(v);
}

/** Formulaire compact et générique pour l'administration du monde. */
export function WorldForm({ path, method, fields, row, back, submit = "Enregistrer" }: { path: string; method: "POST" | "PUT"; fields: Field[]; row: Record<string, unknown> | null; back: string; submit?: string }) {
  const [state, action, pending] = useActionState<WorldFormState, FormData>(saveWorld.bind(null, path, method, fields, back), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `${path}-${f.name}`;
        if (f.kind === "checkbox")
          return (
            <label key={f.name} className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" name={f.name} defaultChecked={Boolean(row?.[f.column ?? f.name])} className="size-4 accent-[var(--accent)]" /> {f.label}
            </label>
          );
        const wide = f.kind === "textarea" || f.kind === "lines";
        return (
          <div key={f.name} className={wide ? "sm:col-span-2" : undefined}>
            <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted">{f.label}</label>
            {wide ? (
              <textarea id={id} name={f.name} rows={f.name === "body" ? 8 : 3} defaultValue={initial(f, row)} required={"required" in f && f.required} className="field text-sm" />
            ) : f.kind === "select" ? (
              <select id={id} name={f.name} defaultValue={initial(f, row) || f.options[0]![0]} className="field">
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.kind === "datetime" ? "datetime-local" : f.kind === "number" ? "number" : f.kind === "url" ? "url" : "text"} defaultValue={initial(f, row)} required={"required" in f && f.required} className="field" />
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Enregistrement…" : submit}</Button>
        {state && "error" in state && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state && "ok" in state && <p role="status" className="text-sm text-success">Enregistré.</p>}
      </div>
    </form>
  );
}
