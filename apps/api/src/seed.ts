/**
 * Données initiales.
 *   pnpm db:seed          → contenu de base (FAQ, saison I à venir, postes de coûts estimés)
 *   pnpm db:seed --demo   → + joueurs/factions FICTIFS pour le développement visuel
 * Refuse de s'exécuter en production avec --demo.
 */
import { randomUUID } from "node:crypto";
import { createDb } from "./db";
import { migrate } from "./migrate";
import { seedShopExamples } from "./shopSeed";
import { seedWorld, seedWorldDemo } from "./worldSeed";

const demo = process.argv.includes("--demo");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant");
if (demo && process.env.NODE_ENV === "production") throw new Error("--demo interdit en production");

const sql = createDb(url, { max: 1 });
await migrate(sql);

const FAQ: [string, string][] = [
  ["Quelle version de Minecraft faut-il ?", "VÆLORIA tourne en Minecraft 1.21. Connecte-toi avec un client Java Edition 1.21."],
  ["Quelle est l'IP du serveur ?", "play.vaeloria.fr — copie-la depuis la page d'accueil et ajoute-la dans « Multijoueur »."],
  ["Comment rejoindre le serveur ?", "Lance Minecraft Java 1.21, clique sur Multijoueur → Ajouter un serveur, colle play.vaeloria.fr puis rejoins."],
  ["Comment fonctionne le Faction ?", "Tu crées ou rejoins une faction, tu claims du territoire, tu construis ta base, tu développes ton économie et tu raids les autres factions. Le Power de ta faction détermine si ses claims peuvent être attaqués."],
  ["Le PvP est-il en 1.8 ?", "Le serveur est en 1.21 mais le combat est réglé pour retrouver les sensations du PvP 1.8 : rythme de clic, combos et knockback calibrés."],
  ["Quand commence la saison ?", "La date d'ouverture de la Saison I est annoncée sur Discord et sur la page Saisons. Inscris-toi à la bêta pour être prévenu."],
  ["Comment rejoindre le Discord ?", "Clique sur le bouton Discord du site. C'est là que sont publiées les annonces, les événements et le support."],
];

await sql.begin(async (tx) => {
  for (const [i, [question, answer]] of FAQ.entries()) {
    await tx`INSERT INTO faq (question, answer, position) SELECT ${question}, ${answer}, ${i}
             WHERE NOT EXISTS (SELECT 1 FROM faq WHERE question = ${question})`;
  }
  await tx`
    INSERT INTO seasons (number, name, status, starts_at, description, objectives, rewards)
    VALUES (1, 'Saison I — Les Premières Bannières', 'upcoming', now() + interval '30 days',
      'La première saison compétitive de VÆLORIA. Toutes les factions partent de zéro.',
      ${tx.json(["Terminer dans le top 3 des factions", "Contrôler le plus d'Outposts", "Remporter le plus de KOTH"])},
      ${tx.json([{ rank: "Top 1", reward: "[À DÉFINIR]" }, { rank: "Top 2", reward: "[À DÉFINIR]" }, { rank: "Top 3", reward: "[À DÉFINIR]" }])})
    ON CONFLICT (number) DO NOTHING`;
  // Estimations Phase 1 — à remplacer par les factures réelles depuis l'admin.
  const costs: [string, string, string, number, number][] = [
    ["Serveur Minecraft (dédié)", "[À RENSEIGNER]", "minecraft", 40, 0.6],
    ["VPS API + site", "[À RENSEIGNER]", "hosting", 8, 0.5],
    ["PostgreSQL (sur le VPS)", "auto-hébergé", "database", 0, 0],
    ["Nom de domaine", "[À RENSEIGNER]", "domain", 1.5, 0],
    ["CDN", "Cloudflare (offre gratuite)", "cdn", 0, 0],
    ["Sauvegardes externes", "[À RENSEIGNER]", "storage", 2, 0.3],
  ];
  for (const [name, provider, category, eur, ratio] of costs) {
    await tx`INSERT INTO cost_items (name, provider, category, monthly_eur, variable_ratio) SELECT ${name}, ${provider}, ${category}, ${eur}, ${ratio}
             WHERE NOT EXISTS (SELECT 1 FROM cost_items WHERE name = ${name})`;
  }
  await tx`INSERT INTO site_settings (key, value) VALUES ('costs.reference_players', '100') ON CONFLICT DO NOTHING`;
  await tx`
    INSERT INTO news (slug, title, excerpt, body, category, status, published_at)
    VALUES ('bienvenue-sur-vaeloria', 'VÆLORIA arrive', 'Un nouveau serveur Faction & PvP français se prépare. Voici ce qui t''attend.',
      ${"## Le retour de la vraie guerre\n\nVÆLORIA est un serveur Minecraft 1.21 dédié au Faction compétitif, avec un combat réglé pour retrouver les sensations du PvP 1.8.\n\n## Ce qui arrive\n\n- Des saisons classées avec un vrai départ à zéro\n- KOTH, Outposts et raids\n- Une économie pensée pour durer toute la saison\n\nRejoins le Discord et inscris-toi à la bêta pour être prévenu de l'ouverture."},
      'actualites', 'published', now())
    ON CONFLICT (slug) DO NOTHING`;
});

console.log(`Boutique : ${await seedShopExamples(sql, { activatePromotion: demo })} produit(s) d'exemple ajouté(s).`);
await seedWorld(sql);
if (demo) await seedWorldDemo(sql);

if (demo) {
  // Données FICTIVES : ne jamais exécuter sur une base de production.
  const already = await sql`SELECT 1 FROM factions f JOIN seasons s ON s.id = f.season_id WHERE s.number = 1 LIMIT 1`;
  if (!already.length) await sql.begin(async (tx) => {
    await tx`UPDATE seasons SET status = 'active', starts_at = now() - interval '10 days', ends_at = now() + interval '50 days' WHERE number = 1`;
    const [season] = await tx<{ id: string }[]>`SELECT id FROM seasons WHERE number = 1`;
    const names = ["Adrien", "Kraken_", "Nyxos", "Valdor", "SirLance", "Mirelle", "Torvik", "Ashen", "Zephyr_", "Brakka", "Lysandre", "Orrin"];
    const uuids = names.map(() => randomUUID());
    for (const [i, name] of names.entries()) {
      await tx`INSERT INTO players (uuid, username, rank, last_seen_at, playtime_seconds, online) VALUES (${uuids[i]!}, ${name}, ${i < 2 ? "Légende" : "Joueur"}, now(), ${(12 - i) * 7200}, ${i % 3 === 0})`;
      await tx`INSERT INTO player_season_stats (season_id, player_uuid, kills, deaths, koth_captures, playtime_seconds)
               VALUES (${season!.id}, ${uuids[i]!}, ${120 - i * 9}, ${30 + i * 4}, ${Math.max(0, 6 - i)}, ${(12 - i) * 7200})`;
    }
    const factions = [["Ordre-Noir", "Discipline, acier et patience."], ["Kraken", "On ne lâche rien."], ["Aube-Rouge", null], ["Valhalla", "Pour la gloire."]] as const;
    for (const [i, [name, desc]] of factions.entries()) {
      const [f] = await tx<{ id: string }[]>`
        INSERT INTO factions (season_id, name, description, leader_uuid, power, max_power, wealth, claims_count, kills, koth_captures)
        VALUES (${season!.id}, ${name}, ${desc}, ${uuids[i * 3]!}, ${180 - i * 30}, 200, ${250000 - i * 50000}, ${60 - i * 12}, ${300 - i * 60}, ${5 - i})
        RETURNING id`;
      for (let m = 0; m < 3; m++) {
        await tx`INSERT INTO faction_members (faction_id, player_uuid, role) VALUES (${f!.id}, ${uuids[i * 3 + m]!}, ${m === 0 ? "LEADER" : m === 1 ? "OFFICER" : "MEMBER"})`;
      }
    }
    await tx`INSERT INTO server_status (server, online, max_players, tps, version, updated_at) VALUES ('factions', 4, 300, 19.9, 'Paper 1.21', now())
             ON CONFLICT (server) DO UPDATE SET updated_at = now()`;
    await tx`INSERT INTO events (slug, title, type, description, starts_at, rewards, published) VALUES
      ('koth-citadelle', 'KOTH — La Citadelle', 'koth', 'Tenez le centre de la Citadelle pendant 5 minutes.', now() + interval '2 days', 'Clé légendaire + 50 000 $', true),
      ('supply-drop-nord', 'Supply drop — Plaine du Nord', 'supply_drop', 'Un largage tombe dans la zone PvP nord.', now() + interval '4 days', 'Équipement P4', true)
      ON CONFLICT (slug) DO NOTHING`;
  });
  console.log("Données de démonstration FICTIVES insérées.");
}

console.log("Seed terminé.");
await sql.end();
