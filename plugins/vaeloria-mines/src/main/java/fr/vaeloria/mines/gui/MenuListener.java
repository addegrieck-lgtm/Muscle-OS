package fr.vaeloria.mines.gui;

import fr.vaeloria.mines.util.Items;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.ClickType;
import org.bukkit.event.inventory.InventoryAction;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.inventory.InventoryCloseEvent;
import org.bukkit.event.inventory.InventoryDragEvent;

public final class MenuListener implements Listener {
    @EventHandler(priority = EventPriority.LOWEST)
    public void onClick(InventoryClickEvent event) {
        if (!(event.getView().getTopInventory().getHolder(false) instanceof Menu menu)) return;
        int topSize = event.getView().getTopInventory().getSize();
        boolean inMenu = event.getRawSlot() >= 0 && event.getRawSlot() < topSize;
        if (inMenu) {
            event.setCancelled(true);
            menu.onClick(event);
            return;
        }
        // Tout ce qui pourrait faire entrer un objet dans le menu est intercepté.
        if (event.isShiftClick() || event.getAction() == InventoryAction.COLLECT_TO_CURSOR
                || event.getClick() == ClickType.DOUBLE_CLICK) {
            event.setCancelled(true);
            if (event.isShiftClick() && !Items.isEmpty(event.getCurrentItem())) {
                menu.onShiftFromInventory(event.getCurrentItem().clone());
            }
        }
    }

    @EventHandler(priority = EventPriority.LOWEST)
    public void onDrag(InventoryDragEvent event) {
        if (!(event.getView().getTopInventory().getHolder(false) instanceof Menu)) return;
        int topSize = event.getView().getTopInventory().getSize();
        if (event.getRawSlots().stream().anyMatch(s -> s < topSize)) event.setCancelled(true);
    }

    @EventHandler
    public void onClose(InventoryCloseEvent event) {
        if (event.getInventory().getHolder(false) instanceof Menu menu) menu.onClose();
    }
}
