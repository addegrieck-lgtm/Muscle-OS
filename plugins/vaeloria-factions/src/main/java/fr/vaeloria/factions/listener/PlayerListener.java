package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import org.bukkit.Location;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerTeleportEvent;

import java.util.Objects;

/** Connexion, déplacements entre territoires, auto-claim et auto-carte. */
public final class PlayerListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;
    private final FactionManager manager;

    public PlayerListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
        this.manager = plugin.manager();
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        Player p = e.getPlayer();
        FPlayer fp = manager.fplayer(p);
        if (!p.getName().equals(fp.name)) {
            fp.name = p.getName();
            manager.markDirty();
        }
        fp.lastSeen = System.currentTimeMillis();
        plugin.scoreboard().show(p);
        Faction f = manager.factionOf(p);
        if (f != null) {
            for (Player m : manager.online(f)) if (m != p) Msg.send(m, "member.online", "player", p.getName());
            if (f.inRaid()) Msg.send(p, "raid.join-warning");
        } else {
            for (Faction o : manager.playerFactions()) {
                if (o.invites.containsKey(p.getUniqueId())) Msg.send(p, "invite.pending", "faction", o.name);
            }
        }
        if (plugin.raid().graceActive()) Msg.send(p, "grace.active", "time", Msg.duration(plugin.raid().graceRemaining()));
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onQuit(PlayerQuitEvent e) {
        Player p = e.getPlayer();
        FPlayer fp = manager.fplayer(p);
        fp.lastSeen = System.currentTimeMillis();
        if (fp.flying) plugin.territory().setFly(p, false);
        fp.autoClaim = false;
        plugin.teleports().cancel(p, false);
        plugin.territory().stopSeeChunk(p.getUniqueId());
        plugin.scoreboard().hide(p);
        plugin.access().forget(p.getUniqueId());
        manager.markDirty();
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onMove(PlayerMoveEvent e) {
        Location from = e.getFrom(), to = e.getTo();
        if (from.getBlockX() == to.getBlockX() && from.getBlockY() == to.getBlockY() && from.getBlockZ() == to.getBlockZ()) return;
        plugin.teleports().onMove(e.getPlayer(), to);
        if (from.getWorld() == to.getWorld() && (from.getBlockX() >> 4) == (to.getBlockX() >> 4) && (from.getBlockZ() >> 4) == (to.getBlockZ() >> 4)) return;
        changedChunk(e.getPlayer(), ChunkPos.of(from), ChunkPos.of(to));
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onTeleport(PlayerTeleportEvent e) {
        ChunkPos a = ChunkPos.of(e.getFrom()), b = ChunkPos.of(e.getTo());
        if (!a.equals(b)) plugin.getServer().getScheduler().runTask(plugin, () -> {
            if (e.getPlayer().isOnline()) changedChunk(e.getPlayer(), a, b);
        });
    }

    private void changedChunk(Player p, ChunkPos from, ChunkPos to) {
        FPlayer fp = manager.fplayer(p);
        Faction mine = manager.factionOf(p);
        if (fp.autoClaim) {
            if (mine == null || !mine.can(p.getUniqueId(), FPerm.CLAIM)) {
                fp.autoClaim = false;
            } else if (!mine.id.equals(manager.ownerId(to))) {
                plugin.claims().claim(p, mine, to, false);
            }
        }
        if (fp.autoMap) plugin.territory().sendMap(p);
        String a = manager.ownerId(from), b = manager.ownerId(to);
        if (!Objects.equals(a, b)) plugin.territory().announce(p, manager.byId(b));
        if (fp.flying && !plugin.territory().canFlyHere(p)) {
            plugin.territory().setFly(p, false);
            Msg.send(p, "fly.left-territory");
        }
    }
}
