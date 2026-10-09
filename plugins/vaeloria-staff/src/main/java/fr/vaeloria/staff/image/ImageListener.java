package fr.vaeloria.staff.image;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.hanging.HangingBreakEvent;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;

/** Choix du mur (clic droit après « Nouvelle image ») et protection des cadres posés. */
public final class ImageListener implements Listener {
    private final VaeloriaStaffPlugin plugin;

    public ImageListener(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteract(PlayerInteractEvent event) {
        Player player = event.getPlayer();
        if (event.getHand() != EquipmentSlot.HAND) return;
        ImageManager.Pending pending = plugin.pendingImages().get(player.getUniqueId());
        if (pending == null) return;
        if (event.getAction() == Action.LEFT_CLICK_BLOCK || event.getAction() == Action.LEFT_CLICK_AIR) {
            if (player.isSneaking()) {
                plugin.pendingImages().remove(player.getUniqueId());
                plugin.msg(player, "Pose de l'image annulée.");
                event.setCancelled(true);
            }
            return;
        }
        if (event.getAction() != Action.RIGHT_CLICK_BLOCK) return;
        event.setCancelled(true);
        Block block = event.getClickedBlock();
        String problem = plugin.images().check(block, event.getBlockFace(), pending.cols(), pending.rows());
        if (problem != null) {
            plugin.msg(player, "&c" + problem + " &7Clique un autre bloc, ou accroupi + clic gauche pour annuler.");
            return;
        }
        plugin.pendingImages().remove(player.getUniqueId());
        plugin.msg(player, "Conversion de l'image (" + pending.cols() + "×" + pending.rows() + " cadres)…");
        plugin.images().place(pending.name(), pending.source(), pending.image(), block, event.getBlockFace(),
                pending.cols(), pending.rows(), pending.dither(), wall -> {
                    plugin.msg(player, "Image &f" + wall.id() + " &7posée !");
                    player.playSound(player.getLocation(), Sound.ENTITY_ITEM_FRAME_ADD_ITEM, 1f, 1f);
                    plugin.getLogger().info(player.getName() + " a posé l'image " + wall.id() + " (" + wall.source() + ")");
                }, error -> plugin.msg(player, "&c" + error));
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.pendingImages().remove(event.getPlayer().getUniqueId());
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onHangingBreak(HangingBreakEvent event) {
        if (plugin.images().idOf(event.getEntity()) != null) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onFrameInteract(PlayerInteractEntityEvent event) {
        if (plugin.images().idOf(event.getRightClicked()) != null) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onFrameDamage(EntityDamageEvent event) {
        if (plugin.images().idOf(event.getEntity()) != null) event.setCancelled(true);
    }
}
