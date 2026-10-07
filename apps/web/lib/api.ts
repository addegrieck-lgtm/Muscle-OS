import "server-only";
import { createApiClient } from "@vaeloria/api-client";

/** Client API côté serveur. Le navigateur ne connaît jamais l'URL interne de l'API. */
export const api = createApiClient({ baseUrl: process.env.API_URL ?? "http://localhost:4000" });
export { orNull } from "@vaeloria/api-client";
