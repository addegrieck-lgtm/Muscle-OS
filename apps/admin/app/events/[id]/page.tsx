import { notFound } from "next/navigation";
import { H1 } from "@/components/Shell";
import { ResourceForm } from "@/components/ResourceForm";
import { adminApi } from "@/lib/api";
import { RESOURCES } from "@/lib/resources";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = RESOURCES.events!;
  let row: (Record<string, unknown> & { id: string }) | null = null;
  if (id !== "new") {
    const { items } = await adminApi<{ items: (Record<string, unknown> & { id: string })[] }>(`/${r.key}`);
    row = items.find((i) => i.id === id) ?? null;
    if (!row) notFound();
  }
  return (
    <>
      <H1>{row ? `Modifier — ${r.title}` : `Créer — ${r.title}`}</H1>
      <ResourceForm resourceKey={r.key} fields={r.fields} row={row} />
    </>
  );
}
