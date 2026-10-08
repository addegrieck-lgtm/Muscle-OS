package fr.vaeloria.factions.service;

import com.google.gson.JsonObject;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Role;
import org.bukkit.Bukkit;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Publication des événements FACTION_* vers le site via VæloriaBridge (dépendance facultative, appelée par
 * réflexion : le plugin fonctionne aussi sans le pont). Format : packages/types/src/bridge.ts.
 */
public final class BridgeHook {
    private final Logger log;
    private Method emit;
    private Method serverName;

    public BridgeHook(Logger log) {
        this.log = log;
        if (Bukkit.getPluginManager().getPlugin("VaeloriaBridge") == null) return;
        try {
            Class<?> c = Class.forName("fr.vaeloria.bridge.VaeloriaBridgePlugin");
            emit = c.getMethod("emit", JsonObject.class);
            serverName = c.getMethod("serverName");
            log.info("VæloriaBridge détecté : les factions sont synchronisées avec le site.");
        } catch (ReflectiveOperationException e) {
            log.warning("VæloriaBridge présent mais incompatible : synchronisation désactivée (" + e.getMessage() + ")");
        }
    }

    public boolean active() { return emit != null; }

    private JsonObject base(String type) {
        JsonObject o = new JsonObject();
        o.addProperty("id", UUID.randomUUID().toString());
        o.addProperty("event", type);
        String server = "factions";
        try {
            if (serverName != null) server = (String) serverName.invoke(null);
        } catch (ReflectiveOperationException ignored) {
        }
        o.addProperty("server", server);
        o.addProperty("occurredAt", Instant.now().toString());
        return o;
    }

    private void send(JsonObject o) {
        if (emit == null) return;
        try {
            emit.invoke(null, o);
        } catch (ReflectiveOperationException e) {
            log.warning("Envoi au pont impossible : " + e.getMessage());
        }
    }

    public void create(Faction f, UUID leader, String leaderName) {
        if (!active() || f.system) return;
        JsonObject o = base("FACTION_CREATE");
        o.addProperty("faction", f.name);
        JsonObject l = new JsonObject();
        l.addProperty("uuid", leader.toString());
        l.addProperty("username", leaderName);
        o.add("leader", l);
        send(o);
    }

    public void disband(Faction f) {
        if (!active() || f.system) return;
        JsonObject o = base("FACTION_DISBAND");
        o.addProperty("faction", f.name);
        send(o);
    }

    public void join(Faction f, UUID uuid, String name, Role role) {
        if (!active() || f.system) return;
        JsonObject o = base("FACTION_JOIN");
        o.addProperty("faction", f.name);
        o.addProperty("uuid", uuid.toString());
        o.addProperty("username", name);
        o.addProperty("role", role.bridgeName());
        send(o);
    }

    public void leave(Faction f, UUID uuid, String name) {
        if (!active() || f.system) return;
        JsonObject o = base("FACTION_LEAVE");
        o.addProperty("faction", f.name);
        o.addProperty("uuid", uuid.toString());
        o.addProperty("username", name);
        send(o);
    }

    public void claim(Faction f, ChunkPos pos, boolean claimed) {
        if (!active() || f.system) return;
        JsonObject o = base(claimed ? "FACTION_CLAIM" : "FACTION_UNCLAIM");
        o.addProperty("faction", f.name);
        o.addProperty("world", pos.world());
        o.addProperty("chunkX", pos.x());
        o.addProperty("chunkZ", pos.z());
        send(o);
    }

    public void snapshot(Faction f, double power, double maxPower, int claims) {
        if (!active() || f.system) return;
        JsonObject o = base("FACTION_SNAPSHOT");
        o.addProperty("faction", f.name);
        o.addProperty("power", power);
        o.addProperty("maxPower", maxPower);
        o.addProperty("wealth", Math.max(0, f.bank));
        o.addProperty("claims", claims);
        send(o);
    }
}
