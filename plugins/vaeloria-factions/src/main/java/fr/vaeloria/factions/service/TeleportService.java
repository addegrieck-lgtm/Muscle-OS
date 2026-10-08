package fr.vaeloria.factions.service;

import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Téléportations avec temps de préparation, annulées si le joueur bouge ou prend des dégâts. */
public final class TeleportService {
    private final JavaPlugin plugin;
    private final Settings settings;
    private final Map<UUID, Pending> pending = new ConcurrentHashMap<>();

    private record Pending(BukkitTask task, Location origin) {}

    public TeleportService(JavaPlugin plugin, Settings settings) {
        this.plugin = plugin;
        this.settings = settings;
    }

    public void teleport(Player p, Location target, String label) {
        cancel(p, false);
        int warmup = p.hasPermission("vaeloria.factions.bypass.warmup") ? 0 : settings.warmupSeconds;
        if (warmup <= 0) {
            go(p, target, label);
            return;
        }
        Msg.send(p, "teleport.warmup", "seconds", warmup, "target", label);
        final int[] left = {warmup};
        BukkitTask task = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (!p.isOnline()) {
                cancel(p, false);
                return;
            }
            left[0]--;
            if (left[0] <= 0) {
                pending.remove(p.getUniqueId()).task().cancel();
                go(p, target, label);
            } else {
                p.sendActionBar(Msg.get("teleport.countdown", "seconds", left[0]));
                p.getWorld().spawnParticle(Particle.PORTAL, p.getLocation().add(0, 1, 0), 20, 0.3, 0.6, 0.3, 0.1);
            }
        }, 20L, 20L);
        pending.put(p.getUniqueId(), new Pending(task, p.getLocation().clone()));
    }

    private void go(Player p, Location target, String label) {
        p.teleportAsync(target).thenAccept(ok -> {
            if (ok) {
                Msg.send(p, "teleport.done", "target", label);
                p.playSound(target, Sound.ENTITY_ENDERMAN_TELEPORT, 0.8f, 1.2f);
            }
        });
    }

    /** Appelé à chaque mouvement : annule si le joueur a changé de bloc. */
    public void onMove(Player p, Location to) {
        Pending pd = pending.get(p.getUniqueId());
        if (pd == null) return;
        Location o = pd.origin();
        if (o.getWorld() != to.getWorld() || o.getBlockX() != to.getBlockX() || o.getBlockY() != to.getBlockY() || o.getBlockZ() != to.getBlockZ()) {
            cancel(p, true);
        }
    }

    public void cancel(Player p, boolean notify) {
        Pending pd = pending.remove(p.getUniqueId());
        if (pd == null) return;
        pd.task().cancel();
        if (notify) Msg.send(p, "teleport.cancelled");
    }

    public boolean isPending(Player p) { return pending.containsKey(p.getUniqueId()); }
}
