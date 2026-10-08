/**
 * Spécification OpenAPI 3.1 (écrite à la main, tenue à jour avec les routes).
 * Servie sur /docs/openapi.json hors production ; en production, uniquement la section publique.
 */
const json = (schema: object) => ({ content: { "application/json": { schema } } });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const ok = (schema: object, description = "OK") => ({ 200: { description, ...json(schema) } });
const err = { $ref: "#/components/responses/Error" };

const bridgeSecurity = [{ BridgeKey: [], BridgeTimestamp: [], BridgeNonce: [], BridgeSignature: [] }];

export function openApiSpec(opts: { includePrivate: boolean }) {
  const publicPaths = {
    "/public/v1/status": { get: { tags: ["Public"], summary: "Statut du réseau", responses: { ...ok(ref("PublicStatus")), 429: err } } },
    "/public/v1/players": { get: { tags: ["Public"], summary: "Joueurs connectés", responses: ok({ type: "object", properties: { online: { type: ["integer", "null"] }, maxPlayers: { type: ["integer", "null"] } } }) } },
    "/public/v1/leaderboards": {
      get: {
        tags: ["Public"],
        summary: "Top 10 d'un classement",
        parameters: [{ name: "category", in: "query", schema: { type: "string", enum: ["factions", "kills", "wealth", "power", "territory", "koth", "activity"] } }],
        responses: ok({ type: "object" }),
      },
    },
    "/public/v1/season": { get: { tags: ["Public"], summary: "Saison actuelle et prochaine", responses: ok({ type: "object" }) } },
  };

  const privatePaths = {
    "/api/v1/server/status": { get: { tags: ["Serveur"], summary: "Statut détaillé", responses: ok(ref("ServerStatus")) } },
    "/api/v1/server/services": { get: { tags: ["Serveur"], summary: "État des services + incidents", responses: ok({ type: "object" }) } },
    "/api/v1/server/players": { get: { tags: ["Serveur"], summary: "Liste des joueurs en ligne", responses: ok({ type: "object" }) } },
    "/api/v1/season": { get: { tags: ["Saisons"], summary: "Saison active / à venir", responses: ok({ type: "object" }) } },
    "/api/v1/leaderboards": { get: { tags: ["Classements"], summary: "Tous les classements (top N)", parameters: [{ name: "limit", in: "query", schema: { type: "integer", maximum: 25 } }], responses: ok({ type: "object" }) } },
    "/api/v1/leaderboards/{category}": {
      get: { tags: ["Classements"], summary: "Classement paginé", parameters: [{ name: "category", in: "path", required: true, schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer" } }], responses: { ...ok(ref("Leaderboard")), 400: err } },
    },
    "/api/v1/player/{username}": { get: { tags: ["Joueurs"], summary: "Profil joueur (pseudo ou UUID)", parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }], responses: { ...ok(ref("PlayerProfile")), 404: err } } },
    "/api/v1/faction/{name}": { get: { tags: ["Factions"], summary: "Profil de faction", parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }], responses: { ...ok({ type: "object" }), 404: err } } },
    "/api/v1/events": { get: { tags: ["Événements"], summary: "Événements à venir", responses: ok({ type: "object" }) } },
    "/api/v1/news": { get: { tags: ["News"], summary: "Articles publiés", parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "category", in: "query", schema: { type: "string" } }], responses: ok({ type: "object" }) } },
    "/api/v1/news/{slug}": { get: { tags: ["News"], summary: "Article", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }], responses: { ...ok({ type: "object" }), 404: err } } },
    "/api/v1/faq": { get: { tags: ["Contenu"], summary: "FAQ", responses: ok({ type: "object" }) } },
    "/api/v1/stats": { get: { tags: ["Serveur"], summary: "Compteurs globaux", responses: ok({ type: "object" }) } },
    "/api/v1/votes": { get: { tags: ["Serveur"], summary: "Votes du mois (heure de Paris) et 20 meilleurs votants", responses: ok({ type: "object" }) } },
    "/api/v1/shop/products": { get: { tags: ["Boutique"], summary: "Produits actifs", responses: ok({ type: "object" }) } },
    "/api/v1/beta": { post: { tags: ["Acquisition"], summary: "Inscription bêta", requestBody: json({ type: "object", required: ["minecraftUsername", "consent"], properties: { minecraftUsername: { type: "string" }, email: { type: "string" }, referralCode: { type: "string" }, consent: { const: true } } }), responses: { 201: { description: "Inscrit" }, 409: err, 429: err } } },
    "/api/v1/analytics": { post: { tags: ["Acquisition"], summary: "Événement analytics first-party", responses: { 204: { description: "Enregistré" } } } },
    "/bridge/v1/events": {
      post: {
        tags: ["Minecraft Bridge"],
        summary: "Lot d'événements du serveur (idempotent par id)",
        security: bridgeSecurity,
        requestBody: json({ type: "object", properties: { events: { type: "array", maxItems: 500, items: { type: "object", required: ["id", "event", "server", "occurredAt"] } } } }),
        responses: { ...ok({ type: "object", properties: { accepted: { type: "integer" }, duplicates: { type: "integer" }, failed: { type: "array" } } }), 401: err },
      },
    },
    "/bridge/v1/commands/claim": { post: { tags: ["Minecraft Bridge"], summary: "Réserver des commandes à exécuter", security: bridgeSecurity, responses: ok({ type: "object" }) } },
    "/bridge/v1/commands/{id}/ack": { post: { tags: ["Minecraft Bridge"], summary: "Accuser l'exécution (DELIVERED/FAILED/DEFERRED)", security: bridgeSecurity, responses: { ...ok({ type: "object" }), 404: err } } },
    "/admin/v1/dashboard": { get: { tags: ["Admin"], summary: "Indicateurs", security: [{ AdminToken: [] }], responses: ok({ type: "object" }) } },
    "/admin/v1/players": { get: { tags: ["Admin"], summary: "Recherche joueurs (pseudo, UUID, Discord, faction)", security: [{ AdminToken: [] }], responses: ok({ type: "object" }) } },
    "/admin/v1/costs": { get: { tags: ["Admin"], summary: "Coûts et projections", security: [{ AdminToken: [] }], responses: ok({ type: "object" }) } },
    "/admin/v1/funnel": { get: { tags: ["Admin"], summary: "Funnel d'acquisition", security: [{ AdminToken: [] }], responses: ok({ type: "object" }) } },
    "/admin/v1/marketing": { get: { tags: ["Admin"], summary: "Sources de trafic et campagnes UTM", security: [{ AdminToken: [] }], responses: ok({ type: "object" }) } },
  };

  return {
    openapi: "3.1.0",
    info: { title: "API VÆLORIA", version: "1.0.0", description: "API du réseau Minecraft VÆLORIA. Les dates sont en ISO 8601 (UTC)." },
    servers: [{ url: "https://api.vaeloria.fr" }],
    paths: opts.includePrivate ? { ...publicPaths, ...privatePaths } : publicPaths,
    components: {
      securitySchemes: {
        ApiKey: { type: "apiKey", in: "header", name: "x-api-key", description: "Facultatif — augmente le quota de l'API publique." },
        AdminToken: { type: "http", scheme: "bearer" },
        BridgeKey: { type: "apiKey", in: "header", name: "x-vaeloria-key" },
        BridgeTimestamp: { type: "apiKey", in: "header", name: "x-vaeloria-timestamp", description: "Epoch en millisecondes" },
        BridgeNonce: { type: "apiKey", in: "header", name: "x-vaeloria-nonce", description: "16–64 caractères, usage unique" },
        BridgeSignature: { type: "apiKey", in: "header", name: "x-vaeloria-signature", description: "hex(HMAC-SHA256(secret, timestamp + '.' + nonce + '.' + corps))" },
      },
      responses: { Error: { description: "Erreur", ...json(ref("Error")) } },
      schemas: {
        Error: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" }, details: {} } } } },
        PublicStatus: { type: "object", properties: { state: { enum: ["online", "offline", "maintenance", "unknown"] }, online: { type: ["integer", "null"] }, maxPlayers: { type: ["integer", "null"] }, version: { type: ["string", "null"] }, checkedAt: { type: "string", format: "date-time" } } },
        ServerStatus: { type: "object", properties: { state: { type: "string" }, online: { type: ["integer", "null"] }, maxPlayers: { type: ["integer", "null"] }, source: { enum: ["bridge", "ping", "none"] } } },
        Leaderboard: { type: "object", properties: { category: { type: "string" }, total: { type: "integer" }, entries: { type: "array", items: { type: "object", properties: { rank: { type: "integer" }, id: { type: "string" }, name: { type: "string" }, value: { type: "number" } } } } } },
        PlayerProfile: { type: "object", properties: { uuid: { type: "string", format: "uuid" }, username: { type: "string" }, stats: { type: "object" } } },
      },
    },
  };
}
