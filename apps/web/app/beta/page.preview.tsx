import { LINKS } from "@vaeloria/config";
import { ButtonLink } from "@vaeloria/ui";
import { BetaPage, betaMeta } from "./BetaPage";

// Aperçu statique : pas de serveur pour enregistrer l'inscription, on renvoie vers Discord.
export const metadata = betaMeta;

export default function Page() {
  return (
    <BetaPage
      form={
        <div className="space-y-4">
          <p className="text-muted">Les inscriptions à la bêta ouvriront avec le site officiel. En attendant, les annonces passent par Discord.</p>
          <ButtonLink href={LINKS.discord} external>Rejoindre le Discord</ButtonLink>
        </div>
      }
    />
  );
}
