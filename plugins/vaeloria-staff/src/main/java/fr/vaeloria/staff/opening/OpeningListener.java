package fr.vaeloria.staff.opening;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import net.kyori.adventure.text.Component;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerLoginEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.server.ServerListPingEvent;

/** Connexions pendant la fermeture, MOTD, récompenses fondateur, feux d'artifice sans dégâts. */
public final class OpeningListener implements Listener {
    private final VaeloriaStaffPlugin plugin;

    public OpeningListener(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGH)
    @SuppressWarnings("deprecation") // PlayerLoginEvent : seul événement qui porte le refus de whitelist
    public void onLogin(PlayerLoginEvent event) {
        if (event.getResult() != PlayerLoginEvent.Result.KICK_WHITELIST) return;
        if (event.getPlayer().hasPermission(Perm.WHITELIST_BYPASS)) {
            event.allow();
            return;
        }
        plugin.opening().refused(event.getPlayer().getUniqueId(), event.getPlayer().getName());
        event.kickMessage(plugin.opening().kickMessage());
    }

    @EventHandler
    public void onPing(ServerListPingEvent event) {
        Component motd = plugin.opening().motd();
        if (motd != null) event.motd(motd);
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent event) {
        plugin.opening().reward(event.getPlayer());
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.opening().quit(event.getPlayer());
    }

    @EventHandler(ignoreCancelled = true)
    public void onFireworkDamage(EntityDamageByEntityEvent event) {
        if (plugin.opening().isOpeningFirework(event.getDamager())) event.setCancelled(true);
    }
}
