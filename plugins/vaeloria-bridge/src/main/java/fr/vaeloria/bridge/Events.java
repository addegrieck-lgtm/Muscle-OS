package fr.vaeloria.bridge;

import com.google.gson.JsonObject;

import java.time.Instant;
import java.util.UUID;

/** Construction des événements du contrat packages/types/src/bridge.ts. */
public final class Events {
    private Events() {}

    public static JsonObject base(String type, String server) {
        JsonObject o = new JsonObject();
        o.addProperty("id", UUID.randomUUID().toString());
        o.addProperty("event", type);
        o.addProperty("server", server);
        o.addProperty("occurredAt", Instant.now().toString());
        return o;
    }

    public static JsonObject player(UUID uuid, String name) {
        JsonObject o = new JsonObject();
        o.addProperty("uuid", uuid.toString());
        o.addProperty("username", name);
        return o;
    }

    public static JsonObject withPlayer(String type, String server, UUID uuid, String name) {
        JsonObject o = base(type, server);
        o.addProperty("uuid", uuid.toString());
        o.addProperty("username", name);
        return o;
    }

    /**
     * Vote Votifier. Le pseudo est celui saisi sur le site de vote : on n'envoie que des valeurs
     * plausibles (un lot rejeté par l'API ferait perdre les autres événements du lot).
     * @return null si le vote est inexploitable.
     */
    public static JsonObject serverVote(String server, String service, String username, String address) {
        if (service == null || username == null) return null;
        String name = username.trim();
        String svc = service.trim();
        if (!name.matches("[A-Za-z0-9_]{3,16}") || svc.isEmpty() || svc.length() > 64) return null;
        JsonObject o = base("SERVER_VOTE", server);
        o.addProperty("service", svc);
        o.addProperty("username", name);
        if (address != null && !address.isBlank() && address.length() <= 64) o.addProperty("address", address.trim());
        return o;
    }
}
