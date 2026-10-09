package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Durations;
import fr.vaeloria.staff.util.Text;
import io.papermc.paper.event.player.AsyncChatEvent;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityPickupItemEvent;
import org.bukkit.event.entity.EntityTargetEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.player.PlayerCommandPreprocessEvent;
import org.bukkit.event.player.PlayerDropItemEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerMoveEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.event.player.PlayerSwapHandItemsEvent;
import org.bukkit.inventory.EquipmentSlot;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

/** Mode staff (outils, protections), invisibilité, freeze, mute, chat staff / verrouillé, invsee en lecture seule. */
public final class ModerationListener implements Listener {
    private final VaeloriaStaffPlugin plugin;

    public ModerationListener(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    // ---- Connexion / déconnexion ----

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onJoin(PlayerJoinEvent event) {
        Player p = event.getPlayer();
        if (plugin.staffMode().is(p)) {
            // Le serveur s'est arrêté brutalement pendant son mode staff : on lui rend son inventaire.
            plugin.staffMode().restore(p);
            plugin.msg(p, "Ton inventaire d'avant le mode staff t'a été rendu.");
        }
        if (plugin.vanish().is(p)) event.joinMessage(null);
        plugin.vanish().onJoin(p);
    }

    @EventHandler(priority = EventPriority.HIGHEST)
    public void onQuit(PlayerQuitEvent event) {
        Player p = event.getPlayer();
        if (plugin.staffMode().is(p)) plugin.staffMode().restore(p);
        if (plugin.vanish().is(p)) event.quitMessage(null);
        if (plugin.freeze().is(p)) {
            plugin.freeze().release(p.getUniqueId());
            plugin.notifyStaff("&c" + p.getName() + " s'est déconnecté en étant immobilisé !");
        }
        plugin.chat().quit(p);
        plugin.readOnly().remove(p.getUniqueId());
    }

    // ---- Freeze ----

    @EventHandler(ignoreCancelled = true)
    public void onMove(PlayerMoveEvent event) {
        if (!plugin.freeze().is(event.getPlayer())) return;
        Location from = event.getFrom(), to = event.getTo();
        if (from.getX() != to.getX() || from.getZ() != to.getZ() || to.getY() > from.getY()) {
            Location back = from.clone();
            back.setYaw(to.getYaw());
            back.setPitch(to.getPitch());
            event.setTo(back);
        }
    }

    @EventHandler(ignoreCancelled = true)
    public void onDamage(EntityDamageEvent event) {
        if (!(event.getEntity() instanceof Player p)) return;
        if (plugin.freeze().is(p) || plugin.staffMode().is(p)) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onAttack(EntityDamageByEntityEvent event) {
        if (event.getDamager() instanceof Player p && (plugin.freeze().is(p) || plugin.staffMode().is(p))) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onTarget(EntityTargetEvent event) {
        if (event.getTarget() instanceof Player p && (plugin.vanish().is(p) || plugin.staffMode().is(p))) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onCommand(PlayerCommandPreprocessEvent event) {
        Player p = event.getPlayer();
        String root = event.getMessage().substring(1).split(" ", 2)[0].toLowerCase(Locale.ROOT);
        if (root.contains(":")) root = root.substring(root.indexOf(':') + 1);
        if (plugin.freeze().is(p) && !plugin.getConfig().getStringList("freeze.allowed-commands").contains(root)) {
            event.setCancelled(true);
            plugin.msg(p, "&cTu es immobilisé : commandes bloquées.");
            return;
        }
        Mutes.Mute mute = plugin.mutes().get(p.getUniqueId());
        if (mute != null && plugin.getConfig().getStringList("sanctions.muted-blocked-commands").contains(root)) {
            event.setCancelled(true);
            plugin.msg(p, muteMessage(mute));
        }
    }

    // ---- Chat (thread asynchrone) ----

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onChat(AsyncChatEvent event) {
        Player p = event.getPlayer();
        if (plugin.chat().inStaffChat(p) && p.hasPermission(Perm.CHAT)) {
            event.setCancelled(true);
            plugin.chat().staffMessage(p, Text.plain(event.message()));
            return;
        }
        Mutes.Mute mute = plugin.mutes().get(p.getUniqueId());
        if (mute != null) {
            event.setCancelled(true);
            plugin.msg(p, muteMessage(mute));
            return;
        }
        if (plugin.chat().locked() && !p.hasPermission(Perm.CHAT_BYPASS)) {
            event.setCancelled(true);
            plugin.msg(p, "&cLe chat est verrouillé.");
        }
    }

    private static String muteMessage(Mutes.Mute mute) {
        String left = mute.until() < 0 ? "définitif" : "encore " + Durations.format(Duration.ofMillis(mute.until() - System.currentTimeMillis()));
        return "&cTu es muet (" + left + ") : &f" + mute.reason();
    }

    // ---- Outils du mode staff ----

    @EventHandler(priority = EventPriority.LOW)
    public void onUseTool(PlayerInteractEvent event) {
        Player p = event.getPlayer();
        if (event.getHand() != EquipmentSlot.HAND || !plugin.staffMode().is(p)) return;
        StaffMode.Tool tool = plugin.staffMode().toolOf(event.getItem());
        if (tool == null) return;
        event.setCancelled(true);
        if (event.getAction() != Action.RIGHT_CLICK_AIR && event.getAction() != Action.RIGHT_CLICK_BLOCK) return;
        switch (tool) {
            case RANDOM_TP -> {
                List<Player> targets = new ArrayList<>();
                for (Player other : Bukkit.getOnlinePlayers()) if (!other.equals(p) && !other.hasPermission(Perm.USE)) targets.add(other);
                if (targets.isEmpty()) {
                    plugin.msg(p, "&cAucun joueur à surveiller.");
                    return;
                }
                Player target = targets.get(ThreadLocalRandom.current().nextInt(targets.size()));
                p.teleport(target);
                plugin.msg(p, "Téléporté vers &f" + target.getName() + "&7.");
            }
            case VANISH -> {
                plugin.vanish().toggle(p);
                plugin.staffMode().giveTools(p);
            }
            case PLAYERS -> new PlayersMenu(plugin, p).open();
            case MENU -> new StaffHubMenu(plugin, p).open();
            default -> plugin.msg(p, "&7Clic droit &fsur un joueur &7avec cet outil.");
        }
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onUseToolOnPlayer(PlayerInteractEntityEvent event) {
        Player p = event.getPlayer();
        if (event.getHand() != EquipmentSlot.HAND || !plugin.staffMode().is(p)) return;
        StaffMode.Tool tool = plugin.staffMode().toolOf(p.getInventory().getItemInMainHand());
        if (tool == null) return;
        event.setCancelled(true);
        Entity clicked = event.getRightClicked();
        if (!(clicked instanceof Player target)) return;
        switch (tool) {
            case INSPECT -> new PlayerMenu(plugin, p, target).open();
            case FREEZE -> {
                if (p.hasPermission(Perm.FREEZE)) plugin.freeze().toggle(p, target);
            }
            case INVSEE -> {
                if (p.hasPermission(Perm.INVSEE)) plugin.openInventory(p, target, false);
            }
            default -> {}
        }
    }

    @EventHandler(ignoreCancelled = true)
    public void onDrop(PlayerDropItemEvent event) {
        if (plugin.staffMode().is(event.getPlayer())) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onSwap(PlayerSwapHandItemsEvent event) {
        if (plugin.staffMode().is(event.getPlayer())) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onPickup(EntityPickupItemEvent event) {
        if (event.getEntity() instanceof Player p && (plugin.staffMode().is(p) || plugin.vanish().is(p))) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent event) {
        if (plugin.staffMode().is(event.getPlayer()) || plugin.freeze().is(event.getPlayer())) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onBreak(BlockBreakEvent event) {
        if (plugin.staffMode().is(event.getPlayer()) || plugin.freeze().is(event.getPlayer())) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInventoryClick(InventoryClickEvent event) {
        if (!(event.getWhoClicked() instanceof Player p)) return;
        if (plugin.readOnly().contains(p.getUniqueId())) {
            event.setCancelled(true);
            return;
        }
        // En mode staff, les outils ne bougent pas (hors menus du plugin, gérés par MenuListener).
        if (plugin.staffMode().is(p) && !(event.getView().getTopInventory().getHolder(false) instanceof Menu)) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInventoryDrag(InventoryDragEvent event) {
        if (event.getWhoClicked() instanceof Player p && (plugin.readOnly().contains(p.getUniqueId()) || plugin.staffMode().is(p))) {
            event.setCancelled(true);
        }
    }

    @EventHandler
    public void onInventoryClose(InventoryCloseEvent event) {
        plugin.readOnly().remove(event.getPlayer().getUniqueId());
    }
}
