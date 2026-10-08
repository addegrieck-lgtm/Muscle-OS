package fr.vaeloria.factions.gui;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;

/** Menu d'inventaire minimal : chaque case peut porter une action. Aucun objet ne peut en être retiré. */
public final class Menu implements InventoryHolder {
    private final Inventory inventory;
    private final Map<Integer, BiConsumer<Player, ClickType>> actions = new HashMap<>();

    public Menu(int rows, Component title) {
        this.inventory = Bukkit.createInventory(this, rows * 9, title);
    }

    public Menu set(int slot, ItemStack item, BiConsumer<Player, ClickType> action) {
        inventory.setItem(slot, item);
        if (action != null) actions.put(slot, action);
        return this;
    }

    public Menu fill(Material pane) {
        ItemStack it = item(pane, Component.text(" "), List.of());
        for (int i = 0; i < inventory.getSize(); i++) if (inventory.getItem(i) == null) inventory.setItem(i, it);
        return this;
    }

    public void click(Player p, int slot, ClickType type) {
        BiConsumer<Player, ClickType> a = actions.get(slot);
        if (a != null) a.accept(p, type);
    }

    public void open(Player p) { p.openInventory(inventory); }

    @Override
    public @NotNull Inventory getInventory() { return inventory; }

    public static ItemStack item(Material m, Component name, List<Component> lore) {
        ItemStack it = new ItemStack(m);
        ItemMeta meta = it.getItemMeta();
        meta.displayName(name.decoration(TextDecoration.ITALIC, false));
        List<Component> l = new ArrayList<>();
        for (Component c : lore) l.add(c.decoration(TextDecoration.ITALIC, false));
        meta.lore(l);
        meta.addItemFlags(ItemFlag.values());
        it.setItemMeta(meta);
        return it;
    }
}
