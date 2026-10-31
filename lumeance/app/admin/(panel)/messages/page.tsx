import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BtnLink, Card, PageTitle, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { back } from "@/lib/admin/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Messages et lettre" };

async function markHandled(form: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("contact_messages")
    .update({ handled: form.get("handled") === "1" })
    .eq("id", z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/messages");
  back("/admin/messages", {});
}

export default async function MessagesPage() {
  const session = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: messages }, { count }] = await Promise.all([
    supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed"),
  ]);
  return (
    <>
      <PageTitle
        title="Messages et lettre"
        subtitle={
          session.role !== "order_manager" ? `${count ?? 0} abonné(s) à la lettre` : undefined
        }
        actions={
          session.role !== "order_manager" ? (
            <BtnLink href="/api/admin/newsletter/export">Exporter les abonnés</BtnLink>
          ) : undefined
        }
      />
      <Table
        head={["Date", "De", "Objet", "Message", "Traité"]}
        empty={messages?.length ? undefined : "Aucun message."}
      >
        {(messages ?? []).map((m) => (
          <tr key={m.id} className={m.handled ? "opacity-50" : ""}>
            <td className="px-4 py-3 align-top text-brun/60">
              {new Date(m.created_at).toLocaleString("fr-FR")}
            </td>
            <td className="px-4 py-3 align-top">
              {m.name}
              <a href={`mailto:${m.email}`} className="block text-xs text-brun/50">
                {m.email}
              </a>
            </td>
            <td className="px-4 py-3 align-top">{m.subject}</td>
            <td className="max-w-md whitespace-pre-line px-4 py-3 align-top text-brun/80">
              {m.message}
            </td>
            <td className="px-4 py-3 align-top">
              <form action={markHandled}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="handled" value={m.handled ? "0" : "1"} />
                <button className="border border-brun/20 px-2 py-1 text-[0.65rem] uppercase">
                  {m.handled ? "Rouvrir" : "Traité"}
                </button>
              </form>
            </td>
          </tr>
        ))}
      </Table>
      <Card title="Demandes RGPD" className="mt-6">
        <p className="text-sm text-brun/70">
          Les demandes d’accès ou de suppression arrivent par ce formulaire (objet « Données
          personnelles »). Délai de réponse : un mois. Procédure détaillée dans{" "}
          <code>docs/RGPD.md</code>.
        </p>
      </Card>
    </>
  );
}
