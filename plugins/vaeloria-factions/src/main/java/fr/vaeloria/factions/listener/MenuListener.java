package fr.vaeloria.factions.listener;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.gui.Menu;
import fr.vaeloria.factions.service.ChestService;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryDragEvent;

public final class MenuListener implements Listener {
    private final VaeloriaFactionsPlugin plugin;

    public MenuListener(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onClick(InventoryClickEvent e) {
        var holder = e.getView().getTopInventory().getHolder(false);
        if (holder instanceof Menu menu) {
            e.setCancelled(true);
            if (e.getClickedInventory() == e.getView().getTopInventory() && e.getWhoClicked() instanceof Player p) {
                plugin.getServer().getScheduler().runTask(plugin, () -> menu.click(p, e.getSlot(), e.getClick()));
            }
        } else if (holder instanceof ChestService.Holder) {
            plugin.manager().markDirty();
        }
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onClose(org.bukkit.event.inventory.InventoryCloseEvent e) {
        if (!(e.getInventory().getHolder(false) instanceof ChestService.Holder h) || !(e.getPlayer() instanceof Player p)) return;
        var f = plugin.manager().byId(h.factionId);
        if (f != null) plugin.logs().chestClosed(p, f, e.getInventory());
    }

    @EventHandler(priority = EventPriority.HIGH)
    public void onDrag(InventoryDragEvent e) {
        var holder = e.getView().getTopInventory().getHolder(false);
        if (holder instanceof Menu) e.setCancelled(true);
        else if (holder instanceof ChestService.Holder) plugin.manager().markDirty();
    }
}
