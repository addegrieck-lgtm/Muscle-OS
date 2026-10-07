package fr.vaeloria.bridge;

import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

/**
 * VæloriaBridge : seul point de contact entre le serveur Minecraft et l'API.
 * Le serveur n'accède jamais à la base de données directement, et le site ne parle jamais au serveur.
 *
 * Les plugins Factions / KOTH du réseau publient leurs événements via {@link #emit(JsonObject)}
 * (voir docs/MINECRAFT_INTEGRATION.md pour le format FACTION_*, KOTH_CAPTURE, ECONOMY_TRANSACTION…).
 */
public final class VaeloriaBridgePlugin extends JavaPlugin implements Listener {
    private static VaeloriaBridgePlugin instance;

    private ApiClient api;
    private EventSpool spool;
    private String serverName;
    private final Map<UUID, Long> sessionStart = new ConcurrentHashMap<>();
    private volatile String lastFlushError = null;

    /** API publique pour les autres plugins du réseau. Thread-safe. */
    public static void emit(JsonObject event) {
        if (instance != null) instance.spool.add(event);
    }

    public static String serverName() {
        return instance == null ? "unknown" : instance.serverName;
    }

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();
        String secret = getConfig().getString("api.secret", "");
        if (secret.length() < 32 || secret.startsWith("REMPLACER")) {
            getLogger().severe("api.secret non configuré (32 caractères minimum) : pont désactivé.");
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        serverName = getConfig().getString("server-name", "factions");
        api = new ApiClient(getConfig().getString("api.url"), getConfig().getString("api.key-id"), secret,
                Duration.ofSeconds(getConfig().getInt("api.timeout-seconds", 5)));
        try {
            spool = new EventSpool(getDataFolder().toPath().resolve("spool"), getConfig().getInt("batch-size", 200));
        } catch (IOException e) {
            throw new IllegalStateException("Impossible de créer le dossier spool", e);
        }
        getServer().getPluginManager().registerEvents(this, this);

        long flush = getConfig().getLong("intervals.flush-seconds", 5) * 20L;
        long heartbeat = getConfig().getLong("intervals.heartbeat-seconds", 30) * 20L;
        long commands = getConfig().getLong("intervals.commands-seconds", 10) * 20L;
        CommandRunner runner = new CommandRunner(this, api, serverName);

        Bukkit.getScheduler().runTaskTimer(this, this::queueHeartbeat, 20L, heartbeat); // lecture TPS sur le thread principal
        Bukkit.getScheduler().runTaskTimerAsynchronously(this, this::flush, flush, flush);
        Bukkit.getScheduler().runTaskTimerAsynchronously(this, runner::poll, commands, commands);
        getLogger().info("VæloriaBridge actif — serveur « " + serverName + " »");
    }

    @Override
    public void onDisable() {
        if (spool == null) return;
        // Les joueurs encore connectés reçoivent un QUIT pour clôturer leur session.
        for (Player p : Bukkit.getOnlinePlayers()) onQuit(p);
        try {
            spool.persistAll();
        } catch (IOException e) {
            getLogger().log(Level.SEVERE, "Événements non sauvegardés à l'arrêt", e);
        }
        instance = null;
    }

    private void flush() {
        try {
            spool.flush(json -> {
                ApiClient.Response res = api.post("/bridge/v1/events", json);
                if (res.status() == 400) {
                    // Lot invalide : le renvoyer en boucle ne servirait à rien. On le journalise et on l'abandonne.
                    getLogger().severe("Lot rejeté par l'API (schéma) : " + res.body());
                    return true;
                }
                lastFlushError = res.ok() ? null : "HTTP " + res.status();
                return res.ok();
            });
        } catch (IOException e) {
            lastFlushError = e.getMessage();
        }
    }

    private void queueHeartbeat() {
        JsonObject o = Events.base("SERVER_HEARTBEAT", serverName);
        o.addProperty("online", Bukkit.getOnlinePlayers().size());
        o.addProperty("maxPlayers", Bukkit.getMaxPlayers());
        o.addProperty("tps", Math.min(20.0, Math.round(Bukkit.getTPS()[0] * 100.0) / 100.0));
        o.addProperty("mspt", Math.round(Bukkit.getAverageTickTime() * 100.0) / 100.0);
        o.addProperty("version", Bukkit.getName() + " " + Bukkit.getMinecraftVersion());
        spool.add(o);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        sessionStart.put(p.getUniqueId(), System.currentTimeMillis());
        spool.add(Events.withPlayer("PLAYER_JOIN", serverName, p.getUniqueId(), p.getName()));
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        onQuit(e.getPlayer());
    }

    private void onQuit(Player p) {
        Long start = sessionStart.remove(p.getUniqueId());
        if (start == null) return;
        JsonObject o = Events.withPlayer("PLAYER_QUIT", serverName, p.getUniqueId(), p.getName());
        o.addProperty("sessionSeconds", Math.max(0, (System.currentTimeMillis() - start) / 1000));
        spool.add(o);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onDeath(PlayerDeathEvent e) {
        Player victim = e.getEntity();
        Player killer = victim.getKiller();
        if (killer == null || killer.equals(victim)) return;
        JsonObject o = Events.base("PLAYER_KILL", serverName);
        o.add("killer", Events.player(killer.getUniqueId(), killer.getName()));
        o.add("victim", Events.player(victim.getUniqueId(), victim.getName()));
        o.addProperty("weapon", killer.getInventory().getItemInMainHand().getType().name());
        spool.add(o);
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        try {
            sender.sendMessage("§6VæloriaBridge §7— serveur §f" + serverName
                    + "§7, en mémoire §f" + spool.pendingInMemory()
                    + "§7, sur disque §f" + spool.pendingOnDisk()
                    + "§7, API §f" + (lastFlushError == null ? "§aOK" : "§c" + lastFlushError));
        } catch (IOException ex) {
            sender.sendMessage("§cErreur : " + ex.getMessage());
        }
        return true;
    }
}
