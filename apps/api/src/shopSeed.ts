/**
 * Catalogue D'EXEMPLE de la boutique. Tous les noms, prix, points, contenus et commandes sont
 * provisoires et se modifient depuis /admin/shop. Le seed n'insère que les produits absents
 * (par slug) : il n'écrase jamais une modification faite dans l'admin.
 *
 * Les commandes Minecraft sont à adapter aux plugins réellement installés (LuckPerms, plugin de spawners…).
 */
import type { Sql } from "./db";

type Delivery = { action: string; command: string | null; requireOnline?: boolean };
type Example = {
  slug: string; name: string; category: string; priceCents: number; points?: number | null; type: string;
  short: string; description: string; deliveries: Delivery[]; sortOrder: number;
};

const give = (item: string, count = 1): Delivery => ({ action: "GIVE_ITEM", command: `give {username} minecraft:${item} ${count}`, requireOnline: true });
const kitGive = (item: string, count = 1): Delivery => ({ ...give(item, count), action: "GIVE_KIT" });
const armor = (m: string) => ["helmet", "chestplate", "leggings", "boots"].map((p) => kitGive(`${m}_${p}`));
const tools = (m: string) => ["sword", "pickaxe", "axe", "shovel"].map((t) => kitGive(`${m}_${t}`));

/** Contenus de kits : volontairement vanilla, sans potion ni objet custom (exemples). */
export const KITS: Record<string, { name: string; items: Delivery[]; summary: string }> = {
  decouverte: { name: "Kit Découverte", summary: "Full cuir, outils en pierre, 16 pains", items: [...armor("leather"), ...tools("stone"), kitGive("bread", 16)] },
  guerrier: { name: "Kit Guerrier", summary: "Full fer, épée et outils en fer, 16 pains", items: [...armor("iron"), ...tools("iron"), kitGive("bread", 16)] },
  seigneur: { name: "Kit Seigneur", summary: "Full fer, épée et outils en fer, bouclier, 32 pains", items: [...armor("iron"), ...tools("iron"), kitGive("shield"), kitGive("bread", 32)] },
  roi: { name: "Kit Roi", summary: "Full diamant, épée et outils en diamant, 32 pains", items: [...armor("diamond"), ...tools("diamond"), kitGive("bread", 32)] },
  vaelorian: { name: "Kit VÆLORIAN", summary: "Full diamant, épée et outils en diamant, arc, 32 flèches, 5 pommes d'or", items: [...armor("diamond"), ...tools("diamond"), kitGive("bow"), kitGive("arrow", 32), kitGive("golden_apple", 5)] },
};

const rankGrant = (key: string): Delivery => ({ action: "GRANT_RANK", command: `lp user {uuid} parent add ${key}` });
const spawners = (n: number): Delivery => ({ action: "GIVE_SPAWNER", command: `spawner give {username} zombie ${n}`, requireOnline: true });
const sync: Delivery = { action: "SYNC_PLAYER", command: null };

const EXAMPLES: Example[] = [
  // Grades : rapportent des points comme tout achat, et débloquent le grade + son kit
  { slug: "grade-guerrier", name: "Guerrier", category: "grades", priceCents: 1500, type: "RANK", sortOrder: 1, short: "Grade Guerrier + Kit Guerrier",
    description: "Débloque le grade Guerrier, le Kit Guerrier et le warp /warp farm-guerrier.", deliveries: [rankGrant("guerrier"), ...KITS.guerrier!.items, sync] },
  { slug: "grade-seigneur", name: "Seigneur", category: "grades", priceCents: 3500, type: "RANK", sortOrder: 2, short: "Grade Seigneur + Kit Seigneur",
    description: "Débloque le grade Seigneur, le Kit Seigneur et le warp /warp farm-seigneur.", deliveries: [rankGrant("seigneur"), ...KITS.seigneur!.items, sync] },
  { slug: "grade-roi", name: "Roi", category: "grades", priceCents: 6500, type: "RANK", sortOrder: 3, short: "Grade Roi + Kit Roi",
    description: "Débloque le grade Roi, le Kit Roi et le warp /warp farm-roi.", deliveries: [rankGrant("roi"), ...KITS.roi!.items, sync] },
  { slug: "grade-vaelorian", name: "VÆLORIAN", category: "grades", priceCents: 10000, type: "RANK", sortOrder: 4, short: "Grade VÆLORIAN + Kit VÆLORIAN",
    description: "Débloque le grade VÆLORIAN, le Kit VÆLORIAN et le warp /warp farm-vaelorian.", deliveries: [rankGrant("vaelorian"), ...KITS.vaelorian!.items, sync] },

  { slug: "spawner-zombie", name: "Spawner Zombie", category: "spawners", priceCents: 500, type: "SPAWNER", sortOrder: 1, short: "1 spawner à zombies",
    description: "Un spawner à zombies à poser dans ta base.", deliveries: [spawners(1)] },
  { slug: "pack-3-spawners", name: "Pack 3 Spawners", category: "spawners", priceCents: 1500, type: "SPAWNER", sortOrder: 2, short: "3 spawners à zombies",
    description: "Trois spawners à zombies.", deliveries: [spawners(3)] },
  { slug: "pack-5-spawners", name: "Pack 5 Spawners", category: "spawners", priceCents: 2200, type: "SPAWNER", sortOrder: 3, short: "5 spawners à zombies",
    description: "Cinq spawners à zombies.", deliveries: [spawners(5)] },
  { slug: "pack-10-spawners", name: "Pack 10 Spawners", category: "spawners", priceCents: 4000, type: "SPAWNER", sortOrder: 4, short: "10 spawners à zombies",
    description: "Dix spawners à zombies.", deliveries: [spawners(10)] },

  { slug: "pack-fer", name: "Pack Fer", category: "items", priceCents: 400, type: "ITEM", sortOrder: 1, short: "128 lingots de fer",
    description: "Deux stacks de lingots de fer.", deliveries: [give("iron_ingot", 64), give("iron_ingot", 64)] },
  { slug: "pack-diamant", name: "Pack Diamant", category: "items", priceCents: 1000, type: "ITEM", sortOrder: 2, short: "32 diamants",
    description: "32 diamants.", deliveries: [give("diamond", 32)] },
  { slug: "pack-construction", name: "Pack Construction", category: "items", priceCents: 500, type: "ITEM", sortOrder: 3, short: "Pierre taillée, bois, verre",
    description: "4 stacks de briques de pierre, 2 stacks de bûches de chêne, 1 stack de verre.",
    deliveries: [give("stone_bricks", 64), give("stone_bricks", 64), give("stone_bricks", 64), give("stone_bricks", 64), give("oak_log", 64), give("oak_log", 64), give("glass", 64)] },
  { slug: "pack-redstone", name: "Pack Redstone", category: "items", priceCents: 600, type: "ITEM", sortOrder: 4, short: "Redstone, répéteurs, pistons, entonnoirs",
    description: "128 redstone, 16 répéteurs, 16 comparateurs, 16 pistons, 16 observateurs, 16 entonnoirs.",
    deliveries: [give("redstone", 64), give("redstone", 64), give("repeater", 16), give("comparator", 16), give("piston", 16), give("observer", 16), give("hopper", 16)] },

  ...(["guerrier", "seigneur", "roi", "vaelorian"] as const).map((k, i) => ({
    slug: `kit-${k}`, name: KITS[k]!.name, category: "kits", priceCents: [300, 500, 800, 1200][i]!, type: "KIT", sortOrder: i + 1,
    short: KITS[k]!.summary, description: `${KITS[k]!.summary}. Équipement vanilla.`, deliveries: KITS[k]!.items,
  })),

  { slug: "pack-depart", name: "Pack Départ", category: "packs", priceCents: 800, type: "PACK", sortOrder: 1, short: "Kit Guerrier + Pack Fer",
    description: "De quoi bien commencer : le Kit Guerrier et 128 lingots de fer.", deliveries: [...KITS.guerrier!.items, give("iron_ingot", 64), give("iron_ingot", 64)] },
  { slug: "pack-faction", name: "Pack Faction", category: "packs", priceCents: 1800, type: "PACK", sortOrder: 2, short: "3 spawners + Pack Construction",
    description: "Pour lancer l'économie et la base de ta faction.", deliveries: [spawners(3), give("stone_bricks", 64), give("stone_bricks", 64), give("oak_log", 64), give("glass", 64)] },
  { slug: "pack-guerre", name: "Pack Guerre", category: "packs", priceCents: 2500, type: "PACK", sortOrder: 3, short: "Kit Roi + 32 diamants",
    description: "Prêt pour la guerre : le Kit Roi et 32 diamants.", deliveries: [...KITS.roi!.items, give("diamond", 32)] },
  { slug: "pack-endgame", name: "Pack Endgame", category: "packs", priceCents: 5000, type: "PACK", sortOrder: 4, short: "Kit VÆLORIAN + 5 spawners + 64 diamants",
    description: "Pour les factions qui visent le sommet.", deliveries: [...KITS.vaelorian!.items, spawners(5), give("diamond", 64)] },

  { slug: "tag-fondateur", name: "Tag Fondateur", category: "cosmetiques", priceCents: 300, type: "COSMETIC", sortOrder: 1, short: "Tag [Fondateur] dans le chat",
    description: "Un tag visible dans le chat. Aucun avantage de jeu.", deliveries: [{ action: "COMMAND", command: "lp user {uuid} permission set vaeloria.tag.fondateur" }] },
];

export async function seedShopExamples(sql: Sql, opts: { activatePromotion?: boolean } = {}): Promise<number> {
  return sql.begin(async (tx) => {
    let created = 0;
    for (const e of EXAMPLES) {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO products (slug, name, category_id, price_cents, points, delivery_type, short_description, description, active, sort_order)
        SELECT ${e.slug}, ${e.name}, c.id, ${e.priceCents}, ${e.points ?? null}, ${e.type}, ${e.short}, ${e.description}, true, ${e.sortOrder}
        FROM product_categories c WHERE c.slug = ${e.category}
        ON CONFLICT (slug) DO NOTHING RETURNING id`;
      if (!row) continue;
      created++;
      for (const [i, d] of e.deliveries.entries()) {
        await tx`INSERT INTO product_deliveries (product_id, position, action, command, require_online)
                 VALUES (${row.id}, ${i}, ${d.action}, ${d.command}, ${d.requireOnline ?? false})`;
      }
    }
    // Chaque grade livre le contenu de son produit (grade + kit), sauf si l'admin a déjà choisi autre chose.
    await tx`
      UPDATE rank_thresholds r SET product_id = p.id FROM products p
      WHERE r.product_id IS NULL AND p.slug = 'grade-' || r.key`;
    await tx`
      INSERT INTO promotions (name, label, kind, value, target_type, target_id, starts_at, ends_at, active)
      SELECT 'Week-end VÆLORIA (exemple)', 'WEEK-END VÆLORIA', 'points_bonus', 3, 'product', p.id, now(), now() + interval '3 days', ${opts.activatePromotion ?? false}
      FROM products p WHERE p.slug = 'pack-3-spawners' AND NOT EXISTS (SELECT 1 FROM promotions WHERE name = 'Week-end VÆLORIA (exemple)')`;
    return created;
  });
}
