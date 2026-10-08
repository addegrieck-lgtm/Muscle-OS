package fr.vaeloria.rtp;

import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.scheduler.BukkitTask;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Level;

import static fr.vaeloria.rtp.Messages.p;
import static fr.vaeloria.rtp.Messages.rich;

/** Déroulé d'un RTP : vérifications, compte à rebours, recherche, téléportation, protection anti-chute. */
public final class TeleportService implements Listener {
    private final VaeloriaRtpPlugin plugin;
    private final Map<UUID, Pending> pending = new ConcurrentHashMap<>();
    private final Map<UUID, Long> protectedUntil = new ConcurrentHashMap<>();

    /** Un joueur ne peut avoir qu'une demande à la fois (compte à rebours ou recherche en cours). */
    private static final class Pending {
        final RtpWorld world;
        final Location origin;
        BukkitTask countdown;
        boolean searching;

        Pending(RtpWorld world, Location origin) {
            this.world = world;
            this.origin = origin;
        }
    }

    public TeleportService(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
    }

    /**
     * Demande de RTP. {@code forced} (admin, console) ignore permission, désactivation, délai et compte à rebours.
     * @return vrai si la demande a été acceptée.
     */
    public boolean request(Player player, RtpWorld s, boolean forced) {
        Messages msg = plugin.messages();
        World world = Bukkit.getWorld(s.worldName());
        if (world == null) {
            msg.send(player, "world-unavailable", rich("world", s.displayName()));
            return false;
        }
        if (pending.containsKey(player.getUniqueId())) {
            msg.send(player, "already-pending");
            return false;
        }
        if (!forced) {
            if (!s.enabled()) {
                msg.send(player, "world-disabled", rich("world", s.displayName()));
                return false;
            }
            if (s.permissionRequired() && !player.hasPermission(s.permissionNode())) {
                msg.send(player, "world-no-permission", rich("world", s.displayName()));
                return false;
            }
            long remaining = remainingCooldown(player, s);
            if (remaining > 0) {
                msg.send(player, "cooldown", rich("world", s.displayName()), p("time", Cooldowns.format(remaining)));
                return false;
            }
        }

        Pending req = new Pending(s, player.getLocation());
        pending.put(player.getUniqueId(), req);
        int warmup = forced || player.hasPermission("vaeloria.rtp.bypass.warmup") ? 0 : s.warmupSeconds();
        if (warmup <= 0) {
            search(player, req, forced);
            return true;
        }
        msg.send(player, "warmup-start", rich("world", s.displayName()), p("seconds", warmup));
        int[] left = {warmup};
        req.countdown = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (!player.isOnline()) {
                cancel(player.getUniqueId(), null);
                return;
            }
            if (left[0] <= 0) {
                req.countdown.cancel();
                req.countdown = null;
                search(player, req, false);
                return;
            }
            player.sendActionBar(msg.component("warmup-actionbar", p("seconds", left[0])));
            player.playSound(player.getLocation(), Sound.BLOCK_NOTE_BLOCK_HAT, 0.6f, 1.4f);
            left[0]--;
        }, 0L, 20L);
        return true;
    }

    public long remainingCooldown(Player player, RtpWorld s) {
        if (player.hasPermission("vaeloria.rtp.bypass.cooldown")) return 0;
        return plugin.cooldowns().remainingSeconds(player.getUniqueId(), s.worldName());
    }

    private void search(Player player, Pending req, boolean forced) {
        req.searching = true;
        Messages msg = plugin.messages();
        RtpWorld s = req.world;
        World world = Bukkit.getWorld(s.worldName());
        if (world == null) {
            pending.remove(player.getUniqueId());
            msg.send(player, "world-unavailable", rich("world", s.displayName()));
            return;
        }
        msg.send(player, "searching", rich("world", s.displayName()));
        plugin.finder().find(world, s).whenComplete((loc, error) -> {
            if (error != null) {
                pending.remove(player.getUniqueId());
                plugin.getLogger().log(Level.WARNING, "Erreur pendant la recherche RTP dans " + s.worldName(), error);
                if (player.isOnline()) msg.send(player, "not-found", rich("world", s.displayName()));
                return;
            }
            if (!player.isOnline() || pending.get(player.getUniqueId()) != req) {
                pending.remove(player.getUniqueId(), req);
                return;
            }
            if (loc == null) {
                pending.remove(player.getUniqueId());
                msg.send(player, "not-found", rich("world", s.displayName()));
                return;
            }
            loc.setYaw(player.getLocation().getYaw());
            loc.setPitch(player.getLocation().getPitch());
            player.teleportAsync(loc).whenComplete((ok, err) -> Bukkit.getScheduler().runTask(plugin, () -> {
                pending.remove(player.getUniqueId());
                if (err != null || !Boolean.TRUE.equals(ok)) {
                    msg.send(player, "not-found", rich("world", s.displayName()));
                    return;
                }
                onArrived(player, s, loc, forced);
            }));
        });
    }

    private void onArrived(Player player, RtpWorld s, Location loc, boolean forced) {
        Messages msg = plugin.messages();
        if (!forced && !player.hasPermission("vaeloria.rtp.bypass.cooldown")) {
            plugin.cooldowns().start(player.getUniqueId(), s.worldName(), s.cooldownSeconds());
        }
        int protection = plugin.getConfig().getInt("teleport.fall-protection-seconds", 5);
        if (protection > 0) protectedUntil.put(player.getUniqueId(), System.currentTimeMillis() + protection * 1000L);
        msg.send(player, "success", rich("world", s.displayName()),
                p("x", loc.getBlockX()), p("y", loc.getBlockY()), p("z", loc.getBlockZ()));
        if (plugin.getConfig().getBoolean("teleport.title", true)) {
            player.showTitle(Title.title(msg.component("title"), msg.component("subtitle", rich("world", s.displayName())),
                    Title.Times.times(Duration.ofMillis(200), Duration.ofMillis(1800), Duration.ofMillis(500))));
        }
        player.playSound(loc, Sound.ENTITY_ENDERMAN_TELEPORT, 1f, 1f);
    }

    /** Annule une demande en attente. {@code reasonKey} : message envoyé au joueur, ou null. */
    public void cancel(UUID uuid, String reasonKey) {
        Pending req = pending.get(uuid);
        if (req == null || req.searching) return;
        pending.remove(uuid);
        if (req.countdown != null) req.countdown.cancel();
        Player p = Bukkit.getPlayer(uuid);
        if (p != null && reasonKey != null) plugin.messages().send(p, reasonKey);
    }

    public void cancelAll() {
        for (UUID uuid : pending.keySet()) cancel(uuid, null);
        pending.clear();
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onMove(PlayerMoveEvent e) {
        if (!e.hasChangedBlock()) return;
        Pending req = pending.get(e.getPlayer().getUniqueId());
        if (req == null || req.searching) return;
        if (plugin.getConfig().getBoolean("teleport.cancel-on-move", true)) cancel(e.getPlayer().getUniqueId(), "cancelled-move");
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDamage(EntityDamageEvent e) {
        if (!(e.getEntity() instanceof Player player)) return;
        UUID uuid = player.getUniqueId();
        if (e.getCause() == EntityDamageEvent.DamageCause.FALL) {
            Long until = protectedUntil.get(uuid);
            if (until != null) {
                if (until > System.currentTimeMillis()) {
                    e.setCancelled(true);
                    return;
                }
                protectedUntil.remove(uuid);
            }
        }
        if (plugin.getConfig().getBoolean("teleport.cancel-on-damage", true)) cancel(uuid, "cancelled-damage");
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent e) {
        cancel(e.getPlayer().getUniqueId(), null);
        protectedUntil.remove(e.getPlayer().getUniqueId());
    }
}
