import { Button, Card, Table } from "@vaeloria/ui";
import { ErrorBox, H1 } from "@/components/Shell";
import { AdjustPointsForm, RankForm, SettingsForm } from "@/components/ShopForms";
import { ShopNav, dt } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";
import { reviewRank, syncRanks } from "@/lib/shopActions";

type R = Parameters<typeof RankForm>[0]["rank"] & { holders: number; productName: string | null };
type Review = { uuid: string; username: string; rankKey: string; rankName: string; minPoints: number; balance: number; unlockedAt: string };

export default async function RanksPage() {
  let ranks: R[], reviews: Review[], products: { id: string; name: string }[], settings: { pointsPerEuro: number; paymentProvider: string | null };
  try {
    [ranks, reviews, products, settings] = await Promise.all([
      adminApi<{ items: R[] }>("/shop/ranks").then((r) => r.items),
      adminApi<{ items: Review[] }>("/shop/ranks/reviews").then((r) => r.items),
      adminApi<{ items: { id: string; name: string }[] }>("/shop/products").then((r) => r.items),
      adminApi<{ pointsPerEuro: number; paymentProvider: string | null }>("/shop/settings"),
    ]);
  } catch (e) {
    return <><H1>Grades & points</H1><ShopNav active="/shop/ranks" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Grades & points</H1>
      <ShopNav active="/shop/ranks" />
      <Card className="mb-8 space-y-3">
        <SettingsForm pointsPerEuro={settings.pointsPerEuro} />
        <p className="text-xs text-muted">Prestataire de paiement actif : <strong>{settings.paymentProvider ?? "aucun (paiement fermé)"}</strong>.</p>
      </Card>

      <h2 className="mb-1 font-semibold">Seuils des grades</h2>
      <p className="mb-3 text-sm text-muted">Les seuils sont lus en direct par la boutique. Abaisser un seuil n&apos;attribue rien tout seul : utilise « Recalculer ». Relever un seuil ne retire jamais un grade déjà obtenu.</p>
      <div className="space-y-2">
        {ranks.map((r) => (
          <div key={r!.key}>
            <RankForm rank={r} products={products} />
            <p className="ml-1 mt-1 text-xs text-subtle">{r!.holders} joueur(s) · contenu : {r!.productName ?? "aucun"}</p>
          </div>
        ))}
        <details className="rounded-md border border-dashed border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold">Ajouter un grade</summary>
          <div className="mt-3"><RankForm rank={null} products={products} /></div>
        </details>
      </div>
      <form action={syncRanks} className="mt-3"><Button type="submit" variant="secondary" size="sm">Recalculer les grades de tous les joueurs</Button></form>

      <h2 className="mb-3 mt-10 font-semibold">Grades à examiner ({reviews.length})</h2>
      <p className="mb-3 text-sm text-muted">Après un remboursement, le solde du joueur est passé sous le seuil. Aucune rétrogradation n&apos;est automatique : décide ici, puis applique le retrait en jeu si nécessaire.</p>
      <Table head={["Joueur", "Grade", "Solde / seuil", "Obtenu le", ""]}>
        {reviews.map((r) => (
          <tr key={`${r.uuid}-${r.rankKey}`}>
            <td className="font-semibold">{r.username}</td>
            <td>{r.rankName}</td>
            <td className="tabular-nums">{r.balance} / {r.minPoints}</td>
            <td className="text-muted">{dt(r.unlockedAt)}</td>
            <td className="flex gap-2">
              <form action={reviewRank.bind(null, r.uuid, r.rankKey, "keep")}><Button type="submit" size="sm" variant="secondary">Conserver</Button></form>
              <form action={reviewRank.bind(null, r.uuid, r.rankKey, "revoke")}><Button type="submit" size="sm" variant="ghost" className="text-danger">Retirer</Button></form>
            </td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-10 font-semibold">Ajuster les points d&apos;un joueur</h2>
      <AdjustPointsForm />
    </>
  );
}
