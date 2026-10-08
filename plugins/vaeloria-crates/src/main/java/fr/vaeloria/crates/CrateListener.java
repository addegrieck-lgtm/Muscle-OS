package fr.vaeloria.crates;

import fr.vaeloria.crates.gui.CrateEditMenu;
import fr.vaeloria.crates.gui.PreviewMenu;
import fr.vaeloria.crates.gui.RollAnimation;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockExplodeEvent;
import org.bukkit.event.block.BlockPistonExtendEvent;
import org.bukkit.event.block.BlockPistonRetractEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;
import org.bukkit.util.Vector;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/** Interactions avec les blocs-coffres : ouverture, aperçu, protection, liaison par l'admin. */
public final class CrateListener implements Listener {
    private final VaeloriaCratesPlugin plugin;

    public CrateListener(VaeloriaCratesPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onInteract(PlayerInteractEvent event) {
        Block block = event.getClickedBlock();
        if (block == null || event.getHand() != EquipmentSlot.HAND) return;
        Player player = event.getPlayer();

        String binding = plugin.binding().remove(player.getUniqueId());
        if (binding != null && event.getAction() == Action.RIGHT_CLICK_BLOCK) {
            event.setCancelled(true);
            plugin.prompts().cancel(player);
            Crate crate = plugin.crates().get(binding);
            if (crate == null) return;
            plugin.crates().bind(crate, block);
            plugin.msg(player, "Ce bloc est maintenant " + crate.name() + "&7.");
            player.playSound(block.getLocation(), Sound.BLOCK_ANVIL_USE, 0.6f, 1.4f);
            new CrateEditMenu(plugin, player, crate).open();
            return;
        }
        if (binding != null) plugin.binding().put(player.getUniqueId(), binding); // clic gauche : on attend toujours

        Crate crate = plugin.crates().at(block);
        if (crate == null) return;
        boolean admin = player.hasPermission("vaeloria.crates.admin");
        if (event.getAction() == Action.LEFT_CLICK_BLOCK) {
            if (admin && player.isSneaking()) return; // laisse l'admin casser le bloc pour retirer le coffre
            event.setCancelled(true);
            new PreviewMenu(plugin, player, crate, null).open();
            return;
        }
        if (event.getAction() != Action.RIGHT_CLICK_BLOCK) return;
        event.setCancelled(true); // n'ouvre jamais le vrai coffre / ender chest
        if (!player.hasPermission("vaeloria.crates.use")) return;
        if (plugin.rolling().containsKey(player.getUniqueId())) return;

        PlayerInventory inv = player.getInventory();
        EquipmentSlot slot = crate.id().equals(plugin.crates().keyOf(inv.getItemInMainHand())) ? EquipmentSlot.HAND
                : crate.id().equals(plugin.crates().keyOf(inv.getItemInOffHand())) ? EquipmentSlot.OFF_HAND : null;
        if (slot == null) {
            refuse(player, block, crate);
            return;
        }
        Reward reward = crate.roll(ThreadLocalRandom.current());
        if (reward == null) {
            plugin.msg(player, "&cCe coffre est vide pour le moment.");
            return;
        }
        // La clé est retirée avant toute remise : pas de double ouverture possible.
        ItemStack key = inv.getItem(slot);
        key.setAmount(key.getAmount() - 1);
        inv.setItem(slot, key.getAmount() <= 0 ? null : key);
        player.playSound(block.getLocation(), Sound.BLOCK_CHEST_OPEN, 0.8f, 1f);

        if (crate.animation()) new RollAnimation(plugin, player, crate, reward).start();
        else plugin.grant(player, crate, reward);
    }

    private void refuse(Player player, Block block, Crate crate) {
        plugin.msg(player, "&cIl te faut une clé " + crate.name() + " &cpour ouvrir ce coffre. &7(clic gauche : voir les lots)");
        player.playSound(player.getLocation(), Sound.ENTITY_VILLAGER_NO, 0.7f, 1f);
        if (!plugin.getConfig().getBoolean("knockback-without-key", true)) return;
        Vector push = player.getLocation().toVector().subtract(block.getLocation().add(0.5, 0, 0.5).toVector());
        push.setY(0);
        if (push.lengthSquared() < 1e-4) return;
        player.setVelocity(push.normalize().multiply(0.6).setY(0.35));
    }

    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent event) {
        Crate crate = plugin.crates().at(event.getBlock());
        if (crate == null) return;
        Player player = event.getPlayer();
        if (player.hasPermission("vaeloria.crates.admin") && player.isSneaking()) {
            plugin.crates().unbind(event.getBlock());
            plugin.msg(player, "Emplacement de " + crate.name() + " &7retiré.");
            return;
        }
        event.setCancelled(true);
        if (player.hasPermission("vaeloria.crates.admin")) {
            plugin.msg(player, "Accroupi + casser pour retirer ce coffre.");
        }
    }

    /** Les clés ne se posent pas (si l'admin a choisi un bloc comme apparence). */
    @EventHandler(priority = EventPriority.LOW, ignoreCancelled = true)
    public void onPlace(BlockPlaceEvent event) {
        if (plugin.crates().keyOf(event.getItemInHand()) != null) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onEntityExplode(EntityExplodeEvent event) {
        protect(event.blockList());
    }

    @EventHandler(ignoreCancelled = true)
    public void onBlockExplode(BlockExplodeEvent event) {
        protect(event.blockList());
    }

    private void protect(List<Block> blocks) {
        blocks.removeIf(b -> plugin.crates().at(b) != null);
    }

    @EventHandler(ignoreCancelled = true)
    public void onPistonExtend(BlockPistonExtendEvent event) {
        if (event.getBlocks().stream().anyMatch(b -> plugin.crates().at(b) != null)) event.setCancelled(true);
    }

    @EventHandler(ignoreCancelled = true)
    public void onPistonRetract(BlockPistonRetractEvent event) {
        if (event.getBlocks().stream().anyMatch(b -> plugin.crates().at(b) != null)) event.setCancelled(true);
    }

    @EventHandler
    public void onQuit(PlayerQuitEvent event) {
        plugin.binding().remove(event.getPlayer().getUniqueId());
        RollAnimation roll = plugin.rolling().get(event.getPlayer().getUniqueId());
        if (roll != null) roll.finish();
    }
}
