package fr.vaeloria.bridge;

import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.PluginManager;

import java.util.logging.Level;

/**
 * Relais VelKoth → site : KOTH_START quand une arène démarre, KOTH_CAPTURE quand elle est gagnée.
 *
 * VelKoth reste optionnel : son API est atteinte par réflexion, sans dépendance de compilation.
 * L'identifiant de l'arène VelKoth doit être la clé de la zone KOTH du site (admin → Monde → Zones).
 */
final class VelKothHook implements Listener {
    private static final String PKG = "dev.velmax.velkoth.";

    private final Plugin plugin;
    private final Plugin velkoth;
    private final String server;

    private VelKothHook(Plugin plugin, Plugin velkoth, String server) {
        this.plugin = plugin;
        this.velkoth = velkoth;
        this.server = server;
    }

    static void registerIfPresent(Plugin plugin, String server) {
        Plugin velkoth = Bukkit.getPluginManager().getPlugin("VelKoth");
        if (velkoth == null || !velkoth.isEnabled()) return;
        try {
            ClassLoader cl = velkoth.getClass().getClassLoader();
            Class<? extends Event> start = Class.forName(PKG + "api.event.KothStartEvent", true, cl).asSubclass(Event.class);
            Class<? extends Event> win = Class.forName(PKG + "api.event.KothWinEvent", true, cl).asSubclass(Event.class);
            VelKothHook hook = new VelKothHook(plugin, velkoth, server);
            PluginManager pm = Bukkit.getPluginManager();
            pm.registerEvent(start, hook, EventPriority.MONITOR, (l, e) -> { if (start.isInstance(e)) hook.onStart(e); }, plugin, true);
            pm.registerEvent(win, hook, EventPriority.MONITOR, (l, e) -> { if (win.isInstance(e)) hook.onWin(e); }, plugin, true);
            plugin.getLogger().info("VelKoth détecté : les KOTH sont relayés au site.");
        } catch (ReflectiveOperationException | ClassCastException e) {
            plugin.getLogger().warning("VelKoth détecté mais son API ne correspond pas : relais KOTH désactivé (" + e + ")");
        }
    }

    private void onStart(Event e) {
        try {
            JsonObject o = Events.base("KOTH_START", server);
            o.addProperty("koth", arenaId(e));
            VaeloriaBridgePlugin.emit(o);
        } catch (ReflectiveOperationException ex) {
            plugin.getLogger().log(Level.WARNING, "KOTH_START non relayé", ex);
        }
    }

    private void onWin(Event e) {
        try {
            Player winner = (Player) call(e, "getWinner");
            if (winner == null) return;
            JsonObject o = Events.withPlayer("KOTH_CAPTURE", server, winner.getUniqueId(), winner.getName());
            o.addProperty("koth", arenaId(e));
            String faction = Events.factionOrNull(teamName(winner));
            if (faction == null) o.add("faction", JsonNull.INSTANCE);
            else o.addProperty("faction", faction);
            VaeloriaBridgePlugin.emit(o);
        } catch (ReflectiveOperationException | ClassCastException ex) {
            plugin.getLogger().log(Level.WARNING, "KOTH_CAPTURE non relayé", ex);
        }
    }

    private String arenaId(Event e) throws ReflectiveOperationException {
        String id = String.valueOf(call(call(e, "getArena"), "id"));
        return id.length() > 64 ? id.substring(0, 64) : id;
    }

    /** Faction du gagnant selon le plugin d'équipes branché sur VelKoth (FactionsUUID, Saber…). */
    private String teamName(Player p) {
        try {
            Object teams = call(velkoth, "getTeamManager");
            Object name = teams.getClass().getMethod("getTeamName", Player.class).invoke(teams, p);
            return name == null ? null : name.toString();
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    private static Object call(Object target, String method) throws ReflectiveOperationException {
        return target.getClass().getMethod(method).invoke(target);
    }
}
