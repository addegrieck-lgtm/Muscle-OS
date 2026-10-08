package fr.vaeloria.rtp.gui;

import fr.vaeloria.rtp.Messages;
import fr.vaeloria.rtp.VaeloriaRtpPlugin;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/** Inventaire-menu : chaque case peut porter une action. Les clics sont toujours annulés (voir {@link MenuListener}). */
public abstract class Menu implements InventoryHolder {
    protected final VaeloriaRtpPlugin plugin;
    protected final Player viewer;
    private final Inventory inventory;
    private final Map<Integer, Consumer<InventoryClickEvent>> actions = new HashMap<>();

    protected Menu(VaeloriaRtpPlugin plugin, Player viewer, int rows, Component title) {
        this.plugin = plugin;
        this.viewer = viewer;
        this.inventory = Bukkit.createInventory(this, Math.max(1, Math.min(6, rows)) * 9, title);
    }

    protected abstract void render();

    public final void open() {
        refresh();
        viewer.openInventory(inventory);
    }

    public final void refresh() {
        inventory.clear();
        actions.clear();
        render();
    }

    protected void set(int slot, ItemStack item, Consumer<InventoryClickEvent> action) {
        if (slot < 0 || slot >= inventory.getSize()) return;
        inventory.setItem(slot, item);
        if (action != null) actions.put(slot, action);
        else actions.remove(slot);
    }

    protected boolean isFree(int slot) {
        return slot >= 0 && slot < inventory.getSize() && inventory.getItem(slot) == null;
    }

    protected int size() {
        return inventory.getSize();
    }

    protected void fill(Material pane) {
        ItemStack filler = item(pane, " ", List.of());
        for (int i = 0; i < inventory.getSize(); i++) if (inventory.getItem(i) == null) inventory.setItem(i, filler);
    }

    void handle(InventoryClickEvent e) {
        Consumer<InventoryClickEvent> action = actions.get(e.getRawSlot());
        if (action != null) action.accept(e);
    }

    @Override
    public @NotNull Inventory getInventory() {
        return inventory;
    }

    public static ItemStack item(Material material, String name, List<String> lore) {
        ItemStack stack = new ItemStack(material == null || !material.isItem() ? Material.BARRIER : material);
        stack.editMeta(meta -> {
            meta.displayName(Messages.ui(name));
            meta.lore(lore.stream().map(Messages::ui).toList());
            meta.addItemFlags(ItemFlag.values());
        });
        return stack;
    }

    public static ItemStack glow(ItemStack stack, boolean glow) {
        if (glow) stack.editMeta(meta -> meta.setEnchantmentGlintOverride(true));
        return stack;
    }

    public static Material material(String name, Material fallback) {
        Material m = name == null ? null : Material.matchMaterial(name);
        return m == null || !m.isItem() || m.isAir() ? fallback : m;
    }
}
