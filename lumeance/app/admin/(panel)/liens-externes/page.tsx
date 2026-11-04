import Link from "next/link";
import { KpiCard } from "@/components/admin/motion";
import { Card, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import {
  isFollow,
  KIND_LABEL,
  referringDomains,
  STATUS_LABEL,
  type BacklinkKind,
  type BacklinkStatus,
} from "@/lib/seo/backlinks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addBacklink,
  checkBacklink,
  deleteBacklink,
  importGscLinks,
  updateBacklink,
} from "./actions";

export const metadata = { title: "Liens externes" };

interface Row {
  id: string;
  source_url: string;
  source_domain: string;
  target_path: string | null;
  kind: BacklinkKind;
  status: BacklinkStatus;
  check_status: "present" | "absent" | "blocked" | "error" | null;
  checked_at: string | null;
  anchor: string | null;
  rel: string | null;
  origin: "manuel" | "search_console";
  notes: string | null;
}

const CHECK: Record<string, string> = {
  present: "Lien présent",
  absent: "Lien absent",
  blocked: "Vérification interdite (robots.txt)",
  error: "Page injoignable",
};
const FILTERS = ["tout", "prospect", "contacte", "obtenu", "perdu", "refuse"] as const;

/** Pistes légitimes, sans adresse inventée : à démarcher soi-même. */
const IDEAS = [
  ["Fiche Google Business Profile", "Déjà créée : vérifiez que le site y figure."],
  ["Pinterest de la maison", "Épinglez chaque pièce avec le lien de sa fiche."],
  [
    "Annuaires professionnels reconnus",
    "Pages Jaunes, chambre de commerce, annuaires de créateurs français.",
  ],
  [
    "Plateformes déco avec profil pro",
    "Profil de vendeur ou de professionnel avec lien vers le site.",
  ],
  [
    "Architectes et décorateurs partenaires",
    "Une page « fournisseurs » ou « réalisations » qui cite LUMÉANCE.",
  ],
  ["Presse et blogs déco", "Proposer une pièce pour un dossier, un visuel ou une interview."],
  [
    "Restaurants, bars, hôtels clients",
    "Crédit « luminaires LUMÉANCE » sur leur site, avec leur accord.",
  ],
] as const;

const TEMPLATE = `Bonjour,

Je suis [prénom], de LUMÉANCE, maison française de luminaires (maisonlumeance.fr).
J’ai beaucoup aimé [article / réalisation précise]. [Une phrase personnelle et sincère.]

Si cela peut servir vos lecteurs, je peux vous transmettre des visuels de [pièce] et répondre à vos questions sur [sujet]. Un lien vers notre site serait apprécié, sans aucune obligation.

Belle journée,
[prénom]`;

export default async function BacklinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.statut as (typeof FILTERS)[number]) ? sp.statut! : "tout";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlinks")
    .select(
      "id, source_url, source_domain, target_path, kind, status, check_status, checked_at, anchor, rel, origin, notes",
    )
    .order("status")
    .order("source_domain");
  const rows = (data as Row[] | null) ?? [];
  const got = rows.filter((r) => r.status === "obtenu");
  const list = filter === "tout" ? rows : rows.filter((r) => r.status === filter);

  return (
    <>
      <PageTitle
        title="Liens externes"
        subtitle="Les sites qui citent LUMÉANCE : obtenus, démarchés, perdus. Aucun achat de lien, aucune campagne automatique."
      />
      <Flash {...flashFrom(sp)} />
      {error && (
        <Flash error="Le suivi n’est pas encore installé : exécutez la migration 20261112000100_backlinks.sql dans Supabase." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sites qui vous citent" value={referringDomains(rows)} />
        <KpiCard
          label="Liens qui transmettent"
          value={got.filter((r) => r.check_status === "present" && isFollow(r.rel ?? "")).length}
          delay={120}
        />
        <KpiCard
          label="Démarches en cours"
          value={rows.filter((r) => r.status === "prospect" || r.status === "contacte").length}
          delay={240}
        />
        <KpiCard
          label="Liens perdus"
          value={rows.filter((r) => r.status === "perdu").length}
          delay={360}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Ajouter une page">
          <form action={addBacklink} className="grid gap-3 md:grid-cols-2">
            <input
              name="source_url"
              required
              placeholder="https://site.fr/page-qui-cite-luméance"
              className={`${inputClass} md:col-span-2`}
            />
            <select name="kind" className={inputClass} defaultValue="autre">
              {Object.entries(KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select name="status" className={inputClass} defaultValue="prospect">
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              name="target_path"
              placeholder="Page visée (ex. /luminaires/escalier)"
              className={inputClass}
            />
            <input name="notes" placeholder="Contact, échéance, contexte…" className={inputClass} />
            <SubmitButton>Ajouter</SubmitButton>
          </form>
        </Card>
        <Card title="Importer depuis Search Console">
          <p className="text-sm text-brun/70">
            Search Console → Liens → « Sites les plus liés » → Exporter (CSV) : collez le contenu
            ci-dessous. Ce sont les liens réellement constatés par Google.
          </p>
          <form action={importGscLinks} className="mt-3 grid gap-3">
            <textarea
              name="csv"
              rows={4}
              required
              className={`${inputClass} font-mono text-xs`}
              placeholder={"Site,Pages liées\nexemple-deco.fr,3"}
            />
            <SubmitButton variant="secondary">Importer</SubmitButton>
          </form>
        </Card>
      </div>

      <div className="mb-3 mt-6 flex flex-wrap gap-1">
        {FILTERS.map((k) => (
          <Link
            key={k}
            href={k === "tout" ? "/admin/liens-externes" : `/admin/liens-externes?statut=${k}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${k === filter ? "bg-brun text-ivoire" : "border border-brun/15"}`}
          >
            {k === "tout" ? "Tout" : STATUS_LABEL[k]} (
            {k === "tout" ? rows.length : rows.filter((r) => r.status === k).length})
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto border border-brun/10 bg-white/60">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-brun/10 text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
            <tr>
              <th className="px-3 py-3 font-medium">Page source</th>
              <th className="px-3 py-3 font-medium">Lien constaté</th>
              <th className="px-3 py-3 font-medium">Suivi</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brun/5">
            {list.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="max-w-[18rem] px-3 py-3">
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    {r.source_domain}
                  </a>
                  <span className="block truncate text-xs text-brun/50">{r.source_url}</span>
                  <span className="text-xs text-brun/55">
                    {KIND_LABEL[r.kind]}
                    {r.origin === "search_console" && " · constaté par Google"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs">
                  {r.check_status ? (
                    <>
                      <span
                        className={
                          r.check_status === "present" ? "text-emerald-700" : "text-red-800"
                        }
                      >
                        {CHECK[r.check_status]}
                      </span>
                      {r.check_status === "present" && (
                        <span className="block text-brun/60">
                          → {r.target_path ?? "/"} · « {r.anchor || "sans texte"} » ·{" "}
                          {isFollow(r.rel ?? "") ? "transmet" : `ne transmet pas (${r.rel})`}
                        </span>
                      )}
                      {r.checked_at && (
                        <span className="block text-brun/45">
                          {new Date(r.checked_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-brun/50">Non vérifié</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <form
                    action={updateBacklink}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <select
                      name="status"
                      defaultValue={r.status}
                      className="border border-brun/15 bg-white px-2 py-1"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <input
                      name="notes"
                      defaultValue={r.notes ?? ""}
                      placeholder="Note"
                      className="w-40 border border-brun/15 bg-white px-2 py-1"
                    />
                    <button className="underline underline-offset-4">OK</button>
                  </form>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <form action={checkBacklink}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="secondary">Vérifier</SubmitButton>
                    </form>
                    <form action={deleteBacklink}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="secondary" confirm="Retirer cette page du suivi ?">
                        Retirer
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <p className="px-4 py-10 text-center text-sm text-brun/50">Aucune page ici.</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Où obtenir des liens, proprement">
          <ul className="space-y-2 text-sm">
            {IDEAS.map(([t, d]) => (
              <li key={t}>
                <span className="font-medium">{t}</span> <span className="text-brun/60">— {d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-brun/55">
            À éviter : achat de liens, échanges de liens en masse, commentaires de blog, réseaux de
            sites. Google les sanctionne, et ils ne servent pas la marque.
          </p>
        </Card>
        <Card title="Modèle de message (à personnaliser, envoyé par vous)">
          <pre className="whitespace-pre-wrap border border-brun/10 bg-white p-3 font-sans text-sm text-brun/80">
            {TEMPLATE}
          </pre>
        </Card>
      </div>
    </>
  );
}
