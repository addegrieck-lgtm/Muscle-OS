import { ButtonLink, Eyebrow } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { CIRCLE_LEVELS, REFERRAL_AMOUNT, REFERRAL_MIN_ORDER } from "@/lib/catalog/loyalty";
import { PRO_TIERS } from "@/lib/catalog/pro";
import { formatPrice } from "@/lib/money";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Avantages — Cercle Luméance, parrainage et comptes entreprise",
  description:
    "Le Cercle Luméance récompense vos achats (jusqu’à −8 % à vie), le parrainage offre 30 € à chacun, et les entreprises profitent de prix HT et d’une remise jusqu’à −20 %.",
  path: "/avantages",
});

function Tiers({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="mt-8 w-full max-w-md text-left">
      <thead>
        <tr className="t-small border-b border-brun/15 text-brun/60">
          <th className="pb-3 font-normal">{head[0]}</th>
          <th className="pb-3 text-right font-normal">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b]) => (
          <tr key={a} className="border-b border-brun/10">
            <td className="py-3">{a}</td>
            <td className="py-3 text-right font-serif text-xl">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdvantagesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Avantages"
        title="Une maison qui se souvient de vous."
        intro="Un compte, et vos achats comme vos recommandations vous reviennent. Pour les professionnels, des prix hors taxes et une remise qui grandit avec le projet."
      />
      <div className="container-luxe space-y-24 pb-32 md:space-y-32">
        <section className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow number="01">Cercle Luméance</Eyebrow>
            <h2 className="t-h2 mt-6">Vos achats vous ouvrent le Cercle.</h2>
          </div>
          <div className="text-brun/80 md:col-span-6 md:col-start-7">
            <p>
              Chaque commande payée compte. Dès le premier palier atteint, la remise s’applique à
              vie, automatiquement, sur toutes vos commandes suivantes.
            </p>
            <Tiers
              head={["Achats cumulés", "Remise à vie"]}
              rows={CIRCLE_LEVELS.map((l) => [
                `${l.name} · dès ${formatPrice(l.min)}`,
                `−${l.percent} %`,
              ])}
            />
          </div>
        </section>

        <section className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow number="02">Parrainage</Eyebrow>
            <h2 className="t-h2 mt-6">{formatPrice(REFERRAL_AMOUNT)} pour chacun.</h2>
          </div>
          <div className="space-y-4 text-brun/80 md:col-span-6 md:col-start-7">
            <p>
              Partagez votre lien personnel, disponible dans votre compte. Votre proche reçoit{" "}
              {formatPrice(REFERRAL_AMOUNT)} sur sa première commande dès{" "}
              {formatPrice(REFERRAL_MIN_ORDER)} ; vous recevez {formatPrice(REFERRAL_AMOUNT)} à
              votre tour dès qu’elle est réglée.
            </p>
            <p className="t-small text-brun/60">Un avoir par commande, sans limite de filleuls.</p>
          </div>
        </section>

        <section className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow number="03">Entreprises</Eyebrow>
            <h2 className="t-h2 mt-6">Prix HT et remise par paliers.</h2>
          </div>
          <div className="space-y-4 text-brun/80 md:col-span-6 md:col-start-7">
            <p>
              Restaurants, hôtels, architectes, bureaux : créez un compte entreprise avec votre
              SIRET. Après vérification, les prix s’affichent hors taxes et la remise s’applique
              seule dans le panier.
            </p>
            <Tiers
              head={["Montant HT des pièces", "Remise"]}
              rows={PRO_TIERS.map((t) => [`Dès ${formatPrice(t.min)} HT`, `−${t.percent} %`])}
            />
          </div>
        </section>

        <div className="flex flex-col items-center gap-6 text-center">
          <p className="t-small max-w-2xl text-brun/60">
            Avantages non cumulables avec les pièces déjà en promotion, hors livraison. Conditions
            détaillées dans nos conditions générales de vente.
          </p>
          <ButtonLink href="/compte/inscription">Créer mon compte</ButtonLink>
        </div>
      </div>
    </>
  );
}
