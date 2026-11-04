import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAccount } from "@/app/actions/account";
import { CopyButton } from "@/components/account/CopyButton";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAdminSession } from "@/lib/auth/admin";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import {
  CIRCLE_LEVELS,
  circleLevel,
  nextCircleLevel,
  REFERRAL_AMOUNT,
  REFERRAL_MIN_ORDER,
} from "@/lib/catalog/loyalty";
import { PRO_TIERS } from "@/lib/catalog/pro";
import { formatPrice } from "@/lib/money";
import { getCurrentAccount } from "@/lib/services/account";
import { pageMetadata } from "@/lib/seo/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = pageMetadata({
  title: "Mon compte",
  description: "Votre compte LUMÉANCE.",
  path: "/compte",
  noindex: true,
});

const PRO_STATUS = {
  pending: {
    label: "En cours de vérification",
    text: "Nous vérifions votre entreprise, en général sous 48 h ouvrées. Vous recevrez un e-mail dès la validation.",
  },
  approved: {
    label: "Compte entreprise validé",
    text: "Les prix s’affichent hors taxes et la remise par paliers s’applique automatiquement dans votre panier.",
  },
  rejected: {
    label: "Non validé",
    text: "Nous n’avons pas pu valider votre compte entreprise. Écrivez-nous pour en parler.",
  },
  none: { label: "", text: "" },
} as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-brun/15 pt-8">
      <h2 className="t-eyebrow text-champagne">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenue?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");
  const account = await getCurrentAccount();
  if (!account) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/compte/connexion?suite=/compte");
    const admin = await getAdminSession();
    return (
      <>
        <PageHeader
          eyebrow="Compte"
          title={admin ? "Aucun compte client." : "Fiche client indisponible."}
          intro={
            admin
              ? "Cette session n’est liée à aucun compte client (accès administration)."
              : "Vous êtes bien connecté, mais votre fiche client n’a pas pu être préparée. Réessayez dans un instant ; si cela persiste, écrivez-nous depuis la page Contact."
          }
        />
        <div className="container-luxe pb-32">
          <form action={signOutAccount}>
            <button className={buttonClass("outline")}>Se déconnecter</button>
          </form>
        </div>
      </>
    );
  }
  const { bienvenue } = await searchParams;
  const pro = account.type === "entreprise";
  const level = circleLevel(account.spent);
  const next = nextCircleLevel(account.spent);
  const link = `${siteUrl}/compte/inscription?parrain=${account.referralCode}`;
  const progress = next
    ? Math.round(((account.spent - (level?.min ?? 0)) / (next.level.min - (level?.min ?? 0))) * 100)
    : 100;

  return (
    <>
      <PageHeader
        eyebrow={pro ? (account.companyName ?? "Compte entreprise") : "Mon compte"}
        title={`Bonjour${account.firstName ? ` ${account.firstName}` : ""}.`}
      />
      <div className="container-luxe grid gap-14 pb-32 lg:grid-cols-12">
        <div className="space-y-12 lg:col-span-7">
          {bienvenue && (
            <p role="status" className="t-small border-l border-champagne bg-creme/60 px-4 py-3">
              Votre adresse est confirmée : bienvenue dans la maison.
            </p>
          )}

          {pro ? (
            <Section title="Compte entreprise">
              <p className="font-serif text-2xl">{PRO_STATUS[account.proStatus].label}</p>
              <p className="text-brun/75">{PRO_STATUS[account.proStatus].text}</p>
              <table className="w-full max-w-md text-left">
                <thead>
                  <tr className="t-small border-b border-brun/15 text-brun/60">
                    <th className="pb-3 font-normal">Montant HT des pièces</th>
                    <th className="pb-3 text-right font-normal">Remise</th>
                  </tr>
                </thead>
                <tbody>
                  {PRO_TIERS.map((t) => (
                    <tr key={t.min} className="border-b border-brun/10">
                      <td className="py-3">Dès {formatPrice(t.min)} HT</td>
                      <td className="py-3 text-right font-serif text-xl">−{t.percent} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="t-small text-brun/60">
                Hors pièces déjà en promotion et hors livraison.
              </p>
            </Section>
          ) : (
            <>
              <Section title="Cercle Luméance">
                <p className="font-serif text-2xl">
                  {level ? `${level.name} · −${level.percent} %` : "Bienvenue"}
                </p>
                <p className="text-brun/75">
                  {formatPrice(account.spent)} d’achats cumulés.
                  {next
                    ? ` Encore ${formatPrice(next.remaining)} pour rejoindre le ${next.level.name} (−${next.level.percent} % à vie).`
                    : " Vous profitez du niveau le plus élevé du Cercle."}
                </p>
                {next && (
                  <div
                    className="h-1 w-full max-w-md bg-brun/10"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progression vers le prochain niveau"
                  >
                    <div className="h-full bg-champagne" style={{ width: `${progress}%` }} />
                  </div>
                )}
                <p className="t-small text-brun/60">
                  {CIRCLE_LEVELS.map(
                    (l) => `${l.name} : −${l.percent} % dès ${formatPrice(l.min)}`,
                  ).join(" · ")}
                  . Remise appliquée automatiquement, hors pièces en promotion.
                </p>
              </Section>

              <Section title="Parrainage">
                <p className="text-brun/75">
                  Offrez {formatPrice(REFERRAL_AMOUNT)} à un proche sur sa première commande (dès{" "}
                  {formatPrice(REFERRAL_MIN_ORDER)}) : vous recevez {formatPrice(REFERRAL_AMOUNT)} à
                  votre tour quand elle est réglée.
                </p>
                <p>
                  Votre code :{" "}
                  <span className="font-serif text-2xl tracking-wider">{account.referralCode}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="t-small break-all bg-creme/70 px-3 py-2">{link}</code>
                  <CopyButton text={link} label="Copier le lien" />
                </div>
                {account.credits.length > 0 && (
                  <p className="text-champagne">
                    Avoirs disponibles :{" "}
                    {account.credits.map((c) => formatPrice(c.amount)).join(", ")} — appliqués
                    automatiquement à votre prochaine commande dès {formatPrice(REFERRAL_MIN_ORDER)}
                    .
                  </p>
                )}
                {account.referred && account.paidOrders === 0 && (
                  <p className="text-champagne">
                    Vous avez été parrainé : {formatPrice(REFERRAL_AMOUNT)} offerts sur votre
                    première commande dès {formatPrice(REFERRAL_MIN_ORDER)}.
                  </p>
                )}
              </Section>
            </>
          )}
        </div>

        <aside className="space-y-8 lg:col-span-4 lg:col-start-9">
          <Section title="Mes informations">
            <dl className="t-small space-y-2 text-brun/80">
              <div>
                <dt className="text-brun/50">E-mail</dt>
                <dd>{account.email}</dd>
              </div>
              {(account.firstName || account.lastName) && (
                <div>
                  <dt className="text-brun/50">Nom</dt>
                  <dd>{[account.firstName, account.lastName].filter(Boolean).join(" ")}</dd>
                </div>
              )}
              {account.phone && (
                <div>
                  <dt className="text-brun/50">Téléphone</dt>
                  <dd>{account.phone}</dd>
                </div>
              )}
              {pro && (
                <div>
                  <dt className="text-brun/50">Entreprise</dt>
                  <dd>
                    {account.companyName} · SIRET {account.siret}
                    {account.vatNumber ? ` · TVA ${account.vatNumber}` : ""}
                  </dd>
                </div>
              )}
            </dl>
            <p className="t-small text-brun/60">
              Pour modifier ces informations ou supprimer votre compte,{" "}
              <Link href="/contact?objet=Mon%20compte" className="underline underline-offset-4">
                écrivez-nous
              </Link>
              .
            </p>
          </Section>
          <div className="flex flex-wrap gap-3">
            <Link href="/compte/nouveau-mot-de-passe" className={buttonClass("outline")}>
              Changer de mot de passe
            </Link>
            <form action={signOutAccount}>
              <button className={buttonClass("outline")}>Se déconnecter</button>
            </form>
          </div>
        </aside>
      </div>
    </>
  );
}
