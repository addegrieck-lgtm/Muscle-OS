package fr.vaeloria.jobs.gui;

import fr.vaeloria.jobs.Text;
import net.kyori.adventure.text.Component;
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

/** Menu en inventaire, en lecture seule : tous les clics y sont annulés. */
public abstract class Menu implements InventoryHolder {
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
        else actions.remove(slot);
    }

    protected void set(int slot, ItemStack item) {
        set(slot, item, null);
    }

    protected void fill(int from, int to, ItemStack item) {
        for (int i = from; i < to; i++) if (inventory.getItem(i) == null) inventory.setItem(i, item);
    }

    void onClick(InventoryClickEvent event) {
        Consumer<InventoryClickEvent> action = actions.get(event.getRawSlot());
        if (action != null) {
            viewer.playSound(viewer.getLocation(), Sound.UI_BUTTON_CLICK, 0.5f, 1.2f);
            action.accept(event);
        }
    }

    /** Icône de menu (MiniMessage), sans italique ni infobulles vanilla. */
    public static ItemStack icon(Material material, String name, List<String> lore, boolean glint) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return item;
        meta.displayName(Text.item(name));
        List<Component> lines = new ArrayList<>();
        for (String l : lore) lines.add(Text.item(l));
        meta.lore(lines);
        meta.addItemFlags(ItemFlag.values());
        if (glint) meta.setEnchantmentGlintOverride(true);
        item.setItemMeta(meta);
        return item;
    }

    public static ItemStack icon(Material material, String name, String... lore) {
        return icon(material, name, List.of(lore), false);
    }

    public static ItemStack pane(Material material) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        if (meta != null) {
            meta.setHideTooltip(true);
            item.setItemMeta(meta);
        }
        return item;
    }
}
