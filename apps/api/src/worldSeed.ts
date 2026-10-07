/**
 * Contenu éditorial par défaut du monde V2 (exemples modifiables dans l'admin) et,
 * en développement uniquement, données FICTIVES pour visualiser empires et guerres.
 * N'écrase jamais un contenu déjà présent.
 */
import { randomUUID } from "node:crypto";
import type { Sql } from "./db";
import { assignFounder } from "./services/world/founders";
import { grantInfluence } from "./services/world/influence";

const ROADMAP: [string, string, string, string, "done" | "current" | "upcoming"][] = [
  ["idee", "Idée", "Un Faction français exigeant, où la guerre a du sens.", "Le constat de départ : les serveurs Faction se ressemblent tous. VÆLORIA veut remettre la compétition et la guerre au centre.", "done"],
  ["pvp", "PvP", "Le combat 1.8 recréé en Minecraft 1.21.", "Rythme de clic, combos, knockback : réglages testés et ajustés avec la communauté.", "current"],
  ["factions", "Factions", "Claims, Power, économie, raids.", "Le socle du Faction, équilibré pour une saison compétitive.", "upcoming"],
  ["empires", "Empires", "Les factions deviennent des empires.", "Identité, blason, recrutement et influence — dès le site, avant même le lancement.", "upcoming"],
  ["guerres", "Guerres", "Des guerres déclarées, suivies et classées.", "Score, territoires, participants : chaque guerre laisse une trace sur la carte et dans l'histoire.", "upcoming"],
  ["beta", "Bêta", "Les premiers combats.", "Tests ouverts aux fondateurs pour éprouver le serveur avant l'ouverture.", "upcoming"],
  ["fondateurs", "3 000 fondateurs", "La communauté fondatrice est réunie.", "Le palier des 3 000 fondateurs déclenche le lancement.", "upcoming"],
  ["lancement", "Lancement", "La Saison I commence.", "Ouverture officielle de VÆLORIA.", "upcoming"],
];

const EPISODES: [number, string, string][] = [
  [1, "Je crée le nouveau serveur Faction français", "Le point de départ de VÆLORIA."],
  [2, "Nous recréons le PvP 1.8 sur Minecraft 1.21", "Comment retrouver les sensations du combat 1.8."],
  [3, "Les joueurs choisissent le système de guerre", "Le Conseil de VÆLORIA décide."],
  [4, "Première bataille de VÆLORIA", "Les premiers empires s'affrontent."],
];

export async function seedWorld(sql: Sql) {
  await sql.begin(async (tx) => {
    for (const [i, [key, title, summary, details, status]] of ROADMAP.entries()) {
      await tx`INSERT INTO roadmap_steps (key, title, summary, details, status, position) VALUES (${key}, ${title}, ${summary}, ${details}, ${status}, ${i})
               ON CONFLICT (key) DO NOTHING`;
    }
    for (const [episode, title, summary] of EPISODES) {
      // Publiés comme « à venir » (sans date ni vidéo) : la vidéo s'ajoute dans l'admin à la sortie.
      await tx`INSERT INTO journal_entries (slug, episode, title, kind, summary, published)
               VALUES (${`episode-${String(episode).padStart(2, "0")}`}, ${episode}, ${title}, 'video', ${summary}, true)
               ON CONFLICT (slug) DO NOTHING`;
    }
    const [poll] = await tx<{ id: string }[]>`
      INSERT INTO polls (slug, question, description, status, closes_at)
      VALUES ('evenement-du-vendredi', 'Quel événement voulez-vous vendredi ?', 'Le Conseil de VÆLORIA décide du premier grand événement.', 'open', now() + interval '14 days')
      ON CONFLICT (slug) DO NOTHING RETURNING id`;
    if (poll) {
      for (const [i, label] of ["Guerre des Royaumes", "Boss mondial", "Ruée vers l'or"].entries()) {
        await tx`INSERT INTO poll_options (poll_id, label, position) VALUES (${poll.id}, ${label}, ${i})`;
      }
    }
  });
}

/** Données FICTIVES (développement uniquement). */
export async function seedWorldDemo(sql: Sql) {
  const empires = [
    { name: "Nightmare", tag: "NGT", color: "#d21f2f", crest: "flamme", motto: "La nuit appartient aux audacieux." },
    { name: "Titans", tag: "TTN", color: "#4f8fdc", crest: "tour", motto: "Rien ne nous fait plier." },
    { name: "Ordre Noir", tag: "ODN", color: "#c3c7cf", crest: "lame", motto: "Discipline, acier et patience." },
    { name: "Aube Rouge", tag: "AUB", color: "#e07a3f", crest: "etoile", motto: "Nous sommes le premier jour." },
  ];
  await sql.begin(async (tx) => {
    const ids: string[] = [];
    for (const [i, e] of empires.entries()) {
      const exists = await tx<{ id: string }[]>`SELECT id FROM empires WHERE tag = ${e.tag}`;
      if (exists[0]) { ids.push(exists[0].id); continue; }
      const members: string[] = [];
      for (let m = 0; m < 3 + i; m++) {
        const [u] = await tx<{ id: string }[]>`INSERT INTO users (display_name) VALUES (${`Démo ${e.tag} ${m + 1}`}) RETURNING id`;
        await assignFounder(tx, u!.id);
        members.push(u!.id);
      }
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO empires (slug, name, tag, motto, color, crest, owner_user_id, invite_code, faction_name)
        VALUES (${e.name.toLowerCase().replace(/ /g, "-")}, ${e.name}, ${e.tag}, ${e.motto}, ${e.color}, ${e.crest}, ${members[0]!}, ${randomUUID().slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, "A")}, ${i === 2 ? "Ordre-Noir" : null})
        RETURNING id`;
      ids.push(row!.id);
      for (const [m, uid] of members.entries()) {
        await tx`INSERT INTO empire_members (user_id, empire_id, role) VALUES (${uid}, ${row!.id}, ${m === 0 ? "leader" : m === 1 ? "officer" : "member"})`;
        await grantInfluence(tx, { userId: uid, kind: "empire_create", key: `demo-influence:${uid}` });
      }
      await tx`UPDATE empires SET influence = ${400 - i * 80} WHERE id = ${row!.id}`;
    }
    await tx`
      INSERT INTO wars (slug, title, attacker_empire_id, defender_empire_id, status, starts_at, attacker_score, defender_score, attacker_territories, defender_territories, participants, summary)
      VALUES ('nightmare-titans', 'Nightmare contre Titans', ${ids[0]!}, ${ids[1]!}, 'active', now() - interval '20 hours', 1240, 1105, 327, 291, 87, 'La première grande guerre de VÆLORIA (données de démonstration).')
      ON CONFLICT (slug) DO NOTHING`;
    await tx`
      INSERT INTO wars (slug, title, attacker_empire_id, defender_empire_id, status, starts_at, ends_at, attacker_score, defender_score, participants, winner_empire_id)
      VALUES ('ordre-noir-aube-rouge', 'Ordre Noir contre Aube Rouge', ${ids[2]!}, ${ids[3]!}, 'ended', now() - interval '5 days', now() - interval '3 days', 860, 640, 41, ${ids[2]!})
      ON CONFLICT (slug) DO NOTHING`;
    await tx`INSERT INTO war_events (war_id, kind, message) SELECT id, 'capture', 'Nightmare prend le col de Vorn' FROM wars WHERE slug = 'nightmare-titans'
             AND NOT EXISTS (SELECT 1 FROM war_events we JOIN wars w ON w.id = we.war_id WHERE w.slug = 'nightmare-titans' AND we.kind = 'capture')`;
    await tx`
      INSERT INTO events (slug, title, type, description, starts_at, ends_at, published, participants, empires_count, zone_key)
      VALUES ('siege-de-kharos', 'Le siège de Kharos', 'siege', 'Quatre empires se disputent la cité de Kharos (démonstration).', now() - interval '48 minutes', now() + interval '12 minutes', true, 87, 4, 'kharos')
      ON CONFLICT (slug) DO NOTHING`;
  });
}
