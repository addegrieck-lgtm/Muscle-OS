package fr.vaeloria.combat;

import org.bukkit.Bukkit;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Échantillonne le ping de chaque joueur toutes les secondes et prévient le staff des connexions instables. */
public final class PingMonitor implements Listener {
    private final JavaPlugin plugin;
    private final Map<UUID, PingStats> stats = new HashMap<>();
    private final Set<UUID> warned = new HashSet<>();
    private int warnPing;
    private int warnJitter;
    private boolean alerts;

    public PingMonitor(JavaPlugin plugin) {
        this.plugin = plugin;
    }

    public void configure(ConfigurationSection c) {
        warnPing = c.getInt("warn-ping-ms", 150);
        warnJitter = c.getInt("warn-jitter-ms", 40);
        alerts = c.getBoolean("staff-alerts", true);
    }

    public void start() {
        Bukkit.getScheduler().runTaskTimer(plugin, this::sample, 20L, 20L);
    }

    public PingStats of(Player p) {
        return stats.computeIfAbsent(p.getUniqueId(), id -> new PingStats());
    }

    public Map<UUID, PingStats> all() {
        return stats;
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        stats.remove(e.getPlayer().getUniqueId());
        warned.remove(e.getPlayer().getUniqueId());
    }

    private void sample() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            PingStats s = of(p);
            s.sample(p.getPing());
            boolean bad = s.ping() >= warnPing || s.jitter() >= warnJitter;
            // Une seule alerte par épisode ; réarmée quand la connexion redevient correcte.
            if (bad && warned.add(p.getUniqueId()) && alerts) {
                Bukkit.broadcast("§e[PvP] §f" + p.getName() + " §7a une connexion instable : ping §f" + s.ping()
                        + " ms §7(±" + s.jitter() + " ms).", "vaeloria.combat.alerts");
            } else if (!bad && s.ping() < warnPing * 0.8 && s.jitter() < warnJitter * 0.8) {
                warned.remove(p.getUniqueId());
            }
        }
    }
}
