package fr.vaeloria.bridge;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;

import java.util.UUID;
import java.util.concurrent.Future;
import java.util.logging.Level;

/**
 * Commandes Web → Minecraft (boutique, récompenses, admin).
 * claim → exécution sur le thread principal → accusé DELIVERED / FAILED / DEFERRED.
 * Si le serveur plante avant l'accusé, l'API redistribue la commande à l'expiration du bail.
 */
public final class CommandRunner {
    private final Plugin plugin;
    private final ApiClient api;
    private final String server;

    public CommandRunner(Plugin plugin, ApiClient api, String server) {
        this.plugin = plugin;
        this.api = api;
        this.server = server;
    }

    /** Appelé en asynchrone. */
    public void poll() {
        try {
            JsonObject req = new JsonObject();
            req.addProperty("server", server);
            req.addProperty("limit", 25);
            ApiClient.Response res = api.post("/bridge/v1/commands/claim", req.toString());
            if (!res.ok()) {
                plugin.getLogger().warning("Récupération des commandes refusée : HTTP " + res.status());
                return;
            }
            for (JsonElement el : JsonParser.parseString(res.body()).getAsJsonObject().getAsJsonArray("commands")) {
                handle(el.getAsJsonObject());
            }
        } catch (Exception e) {
            plugin.getLogger().log(Level.FINE, "API injoignable pour les commandes", e);
        }
    }

    private void handle(JsonObject c) throws Exception {
        String id = c.get("id").getAsString();
        String command = c.get("command").getAsString();
        boolean requireOnline = c.get("requireOnline").getAsBoolean();
        UUID playerUuid = c.get("playerUuid").isJsonNull() ? null : UUID.fromString(c.get("playerUuid").getAsString());

        Future<String> result = Bukkit.getScheduler().callSyncMethod(plugin, () -> {
            Player online = playerUuid == null ? null : Bukkit.getPlayer(playerUuid);
            if (requireOnline && online == null) return "DEFERRED";
            String cmd = command.startsWith("/") ? command.substring(1) : command;
            return Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd) ? "DELIVERED" : "FAILED";
        });
        String status = result.get();
        JsonObject ack = new JsonObject();
        ack.addProperty("status", status);
        if ("FAILED".equals(status)) ack.addProperty("error", "Commande inconnue ou refusée par le serveur");
        api.post("/bridge/v1/commands/" + id + "/ack", ack.toString());
        if (!"DEFERRED".equals(status)) plugin.getLogger().info("Commande web " + id + " → " + status);
    }
}
