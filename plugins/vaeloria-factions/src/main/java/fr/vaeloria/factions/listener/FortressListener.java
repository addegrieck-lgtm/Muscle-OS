package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.service.FortressService;
import fr.vaeloria.factions.util.Msg;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.BlockIgniteEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.entity.EntityToggleGlideEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerBucketEmptyEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerRespawnEvent;
import org.bukkit.event.player.PlayerTeleportEvent;

/** La Forteresse : éliminations, téléportations interdites, carte indestructible. */
public final class FortressListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public FortressListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private FortressService fs() { return plugin.fortress(); }

    private static boolean builder(Player p) {
        return p.hasPermission("vaeloria.factions.zones.build");
    }

    // ── Carte protégée ──

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        if (!builder(e.getPlayer()) && fs().inArena(e.getBlock().getLocation())) {
            e.setCancelled(true);
            e.getPlayer().sendActionBar(Msg.get("fortress.protected"));
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent e) {
        if (!builder(e.getPlayer()) && fs().inArena(e.getBlock().getLocation())) {
            e.setCancelled(true);
            e.getPlayer().sendActionBar(Msg.get("fortress.protected"));
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBucket(PlayerBucketEmptyEvent e) {
        if (!builder(e.getPlayer()) && fs().inArena(e.getBlock().getLocation())) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onIgnite(BlockIgniteEvent e) {
        if (fs().inArena(e.getBlock().getLocation()) && (e.getPlayer() == null || !builder(e.getPlayer()))) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onExplode(EntityExplodeEvent e) {
        e.blockList().removeIf(b -> fs().inArena(b.getLocation()));
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent e) {
        e.blockList().removeIf(b -> fs().inArena(b.getLocation()));
    }

    /** Pas de monstres dans la carte de la Forteresse. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onSpawn(org.bukkit.event.entity.CreatureSpawnEvent e) {
        if (e.getEntity() instanceof org.bukkit.entity.Monster && e.getSpawnReason() == org.bukkit.event.entity.CreatureSpawnEvent.SpawnReason.NATURAL
                && fs().inArena(e.getLocation())) e.setCancelled(true);
    }

    // ── Participants ──

    @EventHandler(priority = EventPriority.HIGH)
    public void onDeath(PlayerDeathEvent e) {
        Player p = e.getEntity();
        if (!fs().isAlive(p.getUniqueId())) return;
        if (plugin.settings().fortressKeepInventory) {
            e.setKeepInventory(true);
            e.getDrops().clear();
            e.setKeepLevel(true);
            e.setDroppedExp(0);
        }
        fs().onDeath(p);
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onRespawn(PlayerRespawnEvent e) {
        Location back = fs().respawnFor(e.getPlayer());
        if (back != null) e.setRespawnLocation(back);
    }

    @EventHandler
    public void onJoin(PlayerJoinEvent e) {
        fs().onJoin(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onQuit(PlayerQuitEvent e) {
        fs().onQuit(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onTeleport(PlayerTeleportEvent e) {
        if (fs().isTeleporting() || !fs().isLocked(e.getPlayer())) return;
        switch (e.getCause()) {
            case COMMAND, PLUGIN, SPECTATE, NETHER_PORTAL, END_PORTAL, END_GATEWAY -> {
                e.setCancelled(true);
                Msg.send(e.getPlayer(), "fortress.no-teleport");
            }
            default -> { }
        }
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onGlide(EntityToggleGlideEvent e) {
        if (e.isGliding() && e.getEntity() instanceof Player p && plugin.settings().fortressBlockElytra && fs().isLocked(p)) {
            e.setCancelled(true);
            p.sendActionBar(Msg.get("fortress.no-elytra"));
        }
    }
}
