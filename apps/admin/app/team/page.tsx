import { Card, Table } from "@vaeloria/ui";
import { dt } from "@/components/ShopNav";
import { ErrorBox, H1, currentAdmin } from "@/components/Shell";
import { TeamForm } from "@/components/TeamForm";
import { adminApi } from "@/lib/api";

export const dynamic = "force-dynamic";
type Member = { displayName: string; email: string | null; role: string; createdAt: string; lastLoginAt: string | null };
const ROLE: Record<string, string> = { owner: "Propriétaire", admin: "Administrateur", moderator: "Modérateur" };

export default async function TeamPage() {
  const me = await currentAdmin();
  let team: Member[];
  try {
    team = (await adminApi<{ items: Member[] }>("/team")).items;
  } catch (e) {
    return <><H1>Équipe</H1><ErrorBox message={(e as Error).message} /></>;
  }
  const owner = me.role === "owner";
  return (
    <>
      <H1>Équipe</H1>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        L&apos;accès au back-office se fait avec un compte du site ayant le rôle administrateur ou propriétaire.
        Pour ajouter quelqu&apos;un : la personne crée son compte sur le site, puis le propriétaire lui donne l&apos;accès ici avec son adresse e-mail.
      </p>
      {owner ? (
        <Card className="mb-8"><TeamForm /></Card>
      ) : (
        <p className="mb-8 text-sm text-muted">Seul le propriétaire peut modifier l&apos;équipe.</p>
      )}
      <Table head={["Nom", "E-mail", "Rôle", "Dernière connexion", ""]}>
        {team.map((m) => (
          <tr key={m.email ?? m.displayName}>
            <td className="font-semibold">{m.displayName}</td>
            <td className="text-muted">{m.email ?? "Discord"}</td>
            <td>{ROLE[m.role] ?? m.role}</td>
            <td className="text-muted">{dt(m.lastLoginAt)}</td>
            <td>{owner && m.email && <TeamForm email={m.email} role={m.role} compact />}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
