import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, Container, EmptyState, Section, buttonClass, formatDate, formatPrice } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { RankProgressCard } from "@/components/shop/RankProgress";
import { pageMeta } from "@/lib/seo";
import { authedApi, getMe } from "@/lib/session";
import { ClaimAdminForm } from "./AdminAccess";
import { LinkForm } from "./LinkForm";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Mon compte", description: "Ton compte VÆLORIA.", path: "/compte", noindex: true });

const STATUS: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "accent" }> = {
  pending: { label: "En attente", tone: "warning" }, paid: { label: "Payée", tone: "accent" }, fulfilled: { label: "Payée", tone: "success" },
  partially_refunded: { label: "Remb. partiel", tone: "warning" }, refunded: { label: "Remboursée", tone: "neutral" }, failed: { label: "Échouée", tone: "danger" },
  cancelled: { label: "Annulée", tone: "neutral" }, expired: { label: "Expirée", tone: "neutral" },
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ admin?: string }> }) {
  const justClaimed = (await searchParams).admin === "1";
  const me = await getMe();
  if (!me) redirect("/login?next=%2Fcompte");
  const staff = me.user.role === "admin" || me.user.role === "owner";
  const adminUrl = process.env.ADMIN_URL ?? "/admin";
  const [orders, catalogRanks] = await Promise.all([
    authedApi<{ items: { publicId: string; status: string; totalCents: number; pointsTotal: number; recipient: string; createdAt: string; items: string }[] }>("/api/v1/me/orders"),
    authedApi<{ ranks: { key: string; name: string; minPoints: number; color: string | null; perks: string[] }[] }>("/api/v1/shop/catalog").then((c) => c.ranks),
  ]);
  return (
    <>
      <PageHeader title={me.user.displayName} eyebrow="Mon compte" crumbs={[{ name: "Mon compte", path: "/compte" }]}>
        <form action="/api/auth/logout" method="post"><button className="text-sm text-subtle underline-offset-2 hover:text-fg hover:underline">Se déconnecter</button></form>
      </PageHeader>
      <Section className="py-8 sm:py-12">
        <Container className="space-y-10">
          {staff && (
            <Card className="flex flex-col gap-3 border-ruby/40 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg font-bold uppercase tracking-[0.05em]">Back-office</p>
                <p className="text-sm text-muted">{justClaimed ? "Accès activé. " : ""}Rôle : {me.user.role === "owner" ? "propriétaire" : "administrateur"}.</p>
              </div>
              <a href={adminUrl} className={buttonClass("primary", "md")}>Ouvrir le back-office</a>
            </Card>
          )}
          {me.minecraft.length === 0 ? (
            <Card className="max-w-xl">
              <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-[0.05em]">Lier mon compte Minecraft</h2>
              <LinkForm />
            </Card>
          ) : (
            me.minecraft.map((m) => (
              <div key={m.uuid} className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-[0.04em]">{m.username}</h2>
                  <span className="font-mono text-xs text-subtle">{m.uuid}</span>
                  <Badge tone="accent">{m.progress.current.name}</Badge>
                </div>
                <RankProgressCard progress={m.progress} ranks={catalogRanks} username={m.username} />
                <Link href={`/compte/points?joueur=${m.uuid}`} className="inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">Historique des points →</Link>
              </div>
            ))
          )}

          <div>
            <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-[0.05em]">Mes commandes</h2>
            {orders.items.length === 0 ? (
              <EmptyState title="Aucune commande pour l'instant"><div className="mt-2"><Link href="/boutique" className="text-accent underline">Découvrir la boutique</Link></div></EmptyState>
            ) : (
              <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
                {orders.items.map((o) => (
                  <li key={o.publicId}>
                    <Link href={`/checkout/confirmation?commande=${o.publicId}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm">{o.publicId}</p>
                        <p className="truncate text-sm text-muted">{o.items} · pour {o.recipient}</p>
                        <p className="text-xs text-subtle">{formatDate(o.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold tabular-nums">{formatPrice(o.totalCents)}</p>
                        <p className="text-xs text-accent">+{o.pointsTotal} pts</p>
                        <Badge tone={STATUS[o.status]?.tone ?? "neutral"}>{STATUS[o.status]?.label ?? o.status}</Badge>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {me.minecraft.length > 0 && (
            <details className="max-w-xl rounded-[var(--radius-card)] border border-line p-4">
              <summary className="cursor-pointer text-sm font-semibold">Lier un autre compte Minecraft</summary>
              <div className="mt-4"><LinkForm /></div>
            </details>
          )}
          {!staff && (
            <details className="max-w-xl text-sm text-muted">
              <summary className="cursor-pointer">Accès équipe</summary>
              <p className="my-3">Propriétaire du serveur ? Saisis le code d&apos;administration défini à l&apos;installation. Les autres membres de l&apos;équipe sont ajoutés depuis le back-office.</p>
              <ClaimAdminForm />
            </details>
          )}
        </Container>
      </Section>
    </>
  );
}
