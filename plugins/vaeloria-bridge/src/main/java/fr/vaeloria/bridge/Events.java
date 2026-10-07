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
}
