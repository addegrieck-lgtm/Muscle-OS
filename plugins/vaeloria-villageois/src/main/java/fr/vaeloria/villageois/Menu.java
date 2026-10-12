package fr.vaeloria.villageois;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/** Menu en inventaire : tous les clics dedans sont annulés (rien ne peut en être retiré). */
abstract class Menu implements InventoryHolder {
    protected final Player viewer;
    private final Inventory inventory;
    private final Map<Integer, Consumer<InventoryClickEvent>> actions = new HashMap<>();

    protected Menu(Player viewer, int rows, String title) {
        this.viewer = viewer;
        this.inventory = Bukkit.createInventory(this, rows * 9, Text.mm(title));
    }

    @Override
    public Inventory getInventory() {
        return inventory;
    }

    protected abstract void render();

    void open() {
        redraw();
        viewer.openInventory(inventory);
    }

    void redraw() {
        inventory.clear();
        actions.clear();
        render();
        for (int i = 0; i < inventory.getSize(); i++) {
            if (inventory.getItem(i) == null) inventory.setItem(i, icon(Material.GRAY_STAINED_GLASS_PANE, " "));
        }
    }

    protected void set(int slot, ItemStack item, Consumer<InventoryClickEvent> action) {
        inventory.setItem(slot, item);
        if (action != null) actions.put(slot, action);
    }

    void onClick(InventoryClickEvent event) {
        Consumer<InventoryClickEvent> action = actions.get(event.getRawSlot());
        if (action == null) return;
        viewer.playSound(viewer.getLocation(), Sound.UI_BUTTON_CLICK, 0.5f, 1.2f);
        action.accept(event);
    }

    static ItemStack icon(Material material, String name, String... lore) {
        return icon(new ItemStack(material), name, List.of(lore));
    }

    static ItemStack icon(ItemStack base, String name, List<String> lore) {
        ItemStack item = base.clone();
        ItemMeta meta = item.getItemMeta();
        meta.displayName(Text.item(name));
        List<net.kyori.adventure.text.Component> lines = new ArrayList<>();
        for (String l : lore) lines.add(Text.item(l));
        meta.lore(lines);
        meta.addItemFlags(ItemFlag.values());
        item.setItemMeta(meta);
        return item;
    }
}
