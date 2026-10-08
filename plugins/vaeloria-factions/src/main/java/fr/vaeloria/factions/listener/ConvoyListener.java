package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.service.ConvoyService;
import org.bukkit.entity.FallingBlock;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.Action;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityChangeBlockEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityPickupItemEvent;
import org.bukkit.event.entity.ItemDespawnEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryDragEvent;
import org.bukkit.event.inventory.InventoryPickupItemEvent;
import org.bukkit.event.inventory.InventoryType;
import org.bukkit.event.player.PlayerDropItemEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.inventory.ItemStack;

/** Caisse et clé du convoi : atterrissage, ouverture, la clé ne se cache pas et ne se perd pas. */
public final class ConvoyListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public ConvoyListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private ConvoyService c() { return plugin.convoy(); }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onLand(EntityChangeBlockEvent e) {
        if (e.getEntity() instanceof FallingBlock fb && c().isCrateEntity(fb)) c().onLanded(fb, e.getBlock());
    }

    /** La caisse s'ouvre au clic droit (en restant à côté), jamais comme un coffre normal. */
    @EventHandler(priority = EventPriority.LOWEST)
    public void onInteract(PlayerInteractEvent e) {
        if (e.getClickedBlock() == null || !c().isCrate(e.getClickedBlock())) return;
        e.setCancelled(true);
        if (e.getAction() == Action.RIGHT_CLICK_BLOCK) c().startOpening(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.LOWEST, ignoreCancelled = true)
    public void onBreak(BlockBreakEvent e) {
        if (c().isCrate(e.getBlock())) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onHurt(EntityDamageEvent e) {
        if (e.getEntity() instanceof Player p) c().interruptOpening(p);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPickup(EntityPickupItemEvent e) {
        if (e.getEntity() instanceof Player p && c().isCurrentKey(e.getItem().getItemStack())) c().pickedUp(p);
        else if (!(e.getEntity() instanceof Player) && c().isKey(e.getItem().getItemStack())) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onDrop(PlayerDropItemEvent e) {
        if (!c().isKey(e.getItemDrop().getItemStack())) return;
        c().prepareDroppedKey(e.getItemDrop());
        c().dropped();
    }

    /** À la mort du porteur, la clé tombe (et brille) : à qui la ramassera. */
    @EventHandler(priority = EventPriority.MONITOR)
    public void onDeath(PlayerDeathEvent e) {
        for (ItemStack it : e.getDrops()) {
            if (c().isCurrentKey(it)) {
                c().dropped();
                org.bukkit.Bukkit.getScheduler().runTask(plugin, () -> {
                    for (var item : e.getEntity().getWorld().getEntitiesByClass(org.bukkit.entity.Item.class)) {
                        if (c().isCurrentKey(item.getItemStack())) c().prepareDroppedKey(item);
                    }
                });
            }
        }
    }

    @EventHandler(priority = EventPriority.LOW)
    public void onQuit(PlayerQuitEvent e) {
        c().carrierQuit(e.getPlayer());
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onJoin(PlayerJoinEvent e) {
        c().onJoin(e.getPlayer());
        // Une clé d'un convoi terminé ne vaut plus rien.
        for (ItemStack it : e.getPlayer().getInventory().getContents()) {
            if (c().isKey(it) && !c().isCurrentKey(it)) e.getPlayer().getInventory().remove(it);
        }
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onDespawn(ItemDespawnEvent e) {
        if (c().isCurrentKey(e.getEntity().getItemStack())) e.setCancelled(true);
    }

    /** Pas de clé rangée dans un coffre, un coffre de l'Ender, un entonnoir… : il faut la porter. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onClick(InventoryClickEvent e) {
        if (e.getView().getTopInventory().getType() == InventoryType.CRAFTING) return; // inventaire du joueur seul
        boolean keyInvolved = c().isKey(e.getCurrentItem()) || c().isKey(e.getCursor())
                || e.getHotbarButton() >= 0 && c().isKey(e.getWhoClicked().getInventory().getItem(e.getHotbarButton()));
        if (keyInvolved) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onDrag(InventoryDragEvent e) {
        if (c().isKey(e.getOldCursor()) && e.getView().getTopInventory().getType() != InventoryType.CRAFTING) e.setCancelled(true);
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onHopper(InventoryPickupItemEvent e) {
        if (c().isKey(e.getItem().getItemStack())) e.setCancelled(true);
    }
}
