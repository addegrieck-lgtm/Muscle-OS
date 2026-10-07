import { z } from "zod";

/**
 * Contrat Minecraft (plugin VæloriaBridge) → API.
 * Chaque événement porte un `id` UUID généré côté plugin : l'API l'utilise pour
 * l'idempotence (un événement renvoyé deux fois n'est traité qu'une fois).
 */
export const MinecraftUuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "UUID invalide")
  .transform((v) => v.toLowerCase());

export const MinecraftUsername = z.string().regex(/^[A-Za-z0-9_]{3,16}$/, "Pseudo Minecraft invalide");

const base = {
  id: z.string().uuid(),
  server: z.string().min(1).max(32),
  occurredAt: z.string().datetime(),
};

const player = { uuid: MinecraftUuid, username: MinecraftUsername };

export const BridgeEvent = z.discriminatedUnion("event", [
  z.object({ ...base, event: z.literal("PLAYER_JOIN"), ...player }),
  z.object({ ...base, event: z.literal("PLAYER_QUIT"), ...player, sessionSeconds: z.number().int().min(0).max(86_400 * 7) }),
  z.object({
    ...base,
    event: z.literal("PLAYER_KILL"),
    killer: z.object(player),
    victim: z.object(player),
    weapon: z.string().max(64).optional(),
  }),
  z.object({ ...base, event: z.literal("FACTION_CREATE"), faction: z.string().min(2).max(24), leader: z.object(player) }),
  z.object({ ...base, event: z.literal("FACTION_DISBAND"), faction: z.string().min(2).max(24) }),
  z.object({ ...base, event: z.literal("FACTION_JOIN"), faction: z.string().min(2).max(24), ...player, role: z.enum(["LEADER", "OFFICER", "MEMBER", "RECRUIT"]) }),
  z.object({ ...base, event: z.literal("FACTION_LEAVE"), faction: z.string().min(2).max(24), ...player }),
  z.object({ ...base, event: z.literal("FACTION_CLAIM"), faction: z.string().min(2).max(24), world: z.string().max(64), chunkX: z.number().int(), chunkZ: z.number().int() }),
  z.object({ ...base, event: z.literal("FACTION_UNCLAIM"), faction: z.string().min(2).max(24), world: z.string().max(64), chunkX: z.number().int(), chunkZ: z.number().int() }),
  z.object({ ...base, event: z.literal("FACTION_SNAPSHOT"), faction: z.string().min(2).max(24), power: z.number(), maxPower: z.number(), wealth: z.number(), claims: z.number().int().min(0) }),
  z.object({ ...base, event: z.literal("KOTH_CAPTURE"), koth: z.string().max(64), faction: z.string().min(2).max(24).nullable(), ...player }),
  z.object({ ...base, event: z.literal("ECONOMY_TRANSACTION"), ...player, amount: z.number(), balanceAfter: z.number(), reason: z.string().max(64) }),
  z.object({ ...base, event: z.literal("PLAYER_RANK_CHANGE"), ...player, rank: z.string().max(32) }),
  z.object({
    ...base,
    event: z.literal("SERVER_HEARTBEAT"),
    online: z.number().int().min(0),
    maxPlayers: z.number().int().min(0),
    tps: z.number().min(0).max(20.5),
    mspt: z.number().min(0).optional(),
    version: z.string().max(64),
  }),
]);
export type BridgeEvent = z.infer<typeof BridgeEvent>;
export type BridgeEventType = BridgeEvent["event"];

export const BridgeEventBatch = z.object({ events: z.array(BridgeEvent).min(1).max(500) });
export type BridgeEventBatch = z.infer<typeof BridgeEventBatch>;

/** DEFERRED : joueur hors ligne, la commande repasse en attente sans consommer de tentative. */
export const CommandAck = z.object({
  status: z.enum(["DELIVERED", "FAILED", "DEFERRED"]),
  error: z.string().max(2000).optional(),
});
export type CommandAck = z.infer<typeof CommandAck>;

/** En-têtes de signature HMAC envoyés par le plugin. */
export const BRIDGE_HEADERS = {
  keyId: "x-vaeloria-key",
  timestamp: "x-vaeloria-timestamp",
  nonce: "x-vaeloria-nonce",
  signature: "x-vaeloria-signature",
} as const;
