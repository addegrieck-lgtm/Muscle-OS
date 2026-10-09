package fr.vaeloria.staff.gui;

import fr.vaeloria.staff.util.Items;
import fr.vaeloria.staff.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Menu en inventaire. Les clics dans le menu sont toujours annulés (rien ne peut en être retiré) ;
 * l'inventaire du joueur reste utilisable pour prendre un objet au curseur et le déposer sur un bouton.
 */
public abstract class Menu implements InventoryHolder {
    protected final Player viewer;
    private final Inventory inventory;
    private final Map<Integer, Consumer<InventoryClickEvent>> actions = new HashMap<>();

    protected Menu(Player viewer, int rows, String title) {
        this.viewer = viewer;
        this.inventory = Bukkit.createInventory(this, rows * 9, Text.of(title));
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    /** (Re)dessine le menu. */
    protected abstract void render();

    public void open() {
        redraw();
        viewer.openInventory(inventory);
    }

    public void redraw() {
        inventory.clear();
        actions.clear();
        render();
    }

    protected void set(int slot, ItemStack item, Consumer<InventoryClickEvent> action) {
        inventory.setItem(slot, item);
        if (action != null) actions.put(slot, action);
    }

    protected void set(int slot, ItemStack item) {
        set(slot, item, null);
    }

    protected void fillEmpty() {
        for (int i = 0; i < inventory.getSize(); i++) {
            if (inventory.getItem(i) == null) inventory.setItem(i, Items.filler());
        }
    }

    /** Clic dans le menu (déjà annulé). */
    public void onClick(InventoryClickEvent event) {
        Consumer<InventoryClickEvent> action = actions.get(event.getRawSlot());
        if (action != null) {
            click();
            action.accept(event);
        }
    }

    /** Shift-clic sur un objet de l'inventaire du joueur (déjà annulé). */
    public void onShiftFromInventory(ItemStack item) {}

    public void onClose() {}

    protected void click() {
        viewer.playSound(viewer.getLocation(), Sound.UI_BUTTON_CLICK, 0.5f, 1.2f);
    }
}
