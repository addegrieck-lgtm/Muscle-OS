"use client";

import { useActionState } from "react";
import { Button } from "@vaeloria/ui";
import { saveResource, type FormState } from "@/lib/actions";
import type { Field } from "@/lib/resources";

function toLocalInput(v: unknown): string {
  if (!v) return "";
  const d = new Date(String(v));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function initial(f: Field, row: Record<string, unknown> | null): string {
  if (!row) return "";
  const v = row[f.column ?? f.name];
  if (v === null || v === undefined) return "";
  if (f.kind === "datetime") return toLocalInput(v);
  if (f.kind === "lines") return (v as string[]).join("\n");
  if (f.kind === "number" && "cents" in f && f.cents) return String(Number(v) / 100);
  return String(v);
}

export function ResourceForm({ resourceKey, fields, row }: { resourceKey: string; fields: Field[]; row: (Record<string, unknown> & { id: string }) | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveResource.bind(null, resourceKey, row?.id ?? null), null);
  return (
    <form action={action} className="grid max-w-3xl gap-4">
      {fields.map((f) => {
        const id = `f-${f.name}`;
        if (f.kind === "checkbox") {
          return (
            <label key={f.name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={f.name} defaultChecked={Boolean(row?.[f.column ?? f.name])} className="size-4 accent-[var(--accent)]" /> {f.label}
            </label>
          );
        }
        return (
          <div key={f.name}>
            <label htmlFor={id} className="mb-1 block text-sm font-semibold">{f.label}</label>
            {f.kind === "textarea" || f.kind === "lines" ? (
              <textarea id={id} name={f.name} rows={f.name === "body" ? 14 : 4} defaultValue={initial(f, row)} required={"required" in f && f.required} className="field font-mono text-sm" />
            ) : f.kind === "select" ? (
              <select id={id} name={f.name} defaultValue={initial(f, row) || f.options[0]![0]} className="field">
                {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.kind === "datetime" ? "datetime-local" : f.kind === "number" ? "number" : f.kind === "url" ? "url" : "text"}
                step={f.kind === "number" && "cents" in f && f.cents ? "0.01" : undefined}
                defaultValue={initial(f, row)}
                required={"required" in f && f.required}
                className="field"
              />
            )}
          </div>
        );
      })}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</Button></div>
    </form>
  );
}
