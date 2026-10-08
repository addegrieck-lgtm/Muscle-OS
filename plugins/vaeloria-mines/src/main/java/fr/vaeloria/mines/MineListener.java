package fr.vaeloria.mines;

import fr.vaeloria.mines.model.BlockPos;
import fr.vaeloria.mines.model.Mine;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;

/** Baguette de sélection, comptage des blocs minés (réinitialisation au %), blocage pendant le remplissage. */
public final class MineListener implements Listener {
    private final VaeloriaMinesPlugin plugin;

    public MineListener(VaeloriaMinesPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onWand(PlayerInteractEvent event) {
        Block block = event.getClickedBlock();
        Player player = event.getPlayer();
        if (block == null || event.getHand() != EquipmentSlot.HAND || !plugin.isWand(event.getItem())) return;
        if (!player.hasPermission("vaeloria.mines.admin")) return;
        event.setCancelled(true);
        BlockPos pos = VaeloriaMinesPlugin.blockPos(block.getLocation());
        if (event.getAction() == Action.LEFT_CLICK_BLOCK) {
            plugin.pos1(player, pos);
            plugin.selectionFeedback(player, 1, pos);
        } else if (event.getAction() == Action.RIGHT_CLICK_BLOCK) {
            plugin.pos2(player, pos);
            plugin.selectionFeedback(player, 2, pos);
        }
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBreakGuard(BlockBreakEvent event) {
        Player player = event.getPlayer();
        // En créatif, le clic gauche casse le bloc : la baguette ne doit jamais rien détruire.
        if (plugin.isWand(player.getInventory().getItemInMainHand()) && player.hasPermission("vaeloria.mines.admin")) {
            event.setCancelled(true);
            return;
        }
        Mine mine = plugin.mines().at(event.getBlock());
        if (mine != null && mine.resetting()) event.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent event) {
        Mine mine = plugin.mines().at(event.getBlock());
        if (mine == null || mine.resetting()) return;
        mine.mined(mine.mined() + 1);
        if (mine.resetPercent() > 0 && mine.minedPercent() >= mine.resetPercent() && mine.ready()) {
            String error = plugin.resetter().start(mine, MineResetter.Cause.PERCENT);
            if (error != null) plugin.getLogger().warning("Mine " + mine.id() + " non réinitialisée : " + error);
        }
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.forgetSelection(event.getPlayer());
        plugin.prompts().cancel(event.getPlayer());
    }
}
