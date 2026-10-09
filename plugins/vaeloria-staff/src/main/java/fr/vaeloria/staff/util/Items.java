package fr.vaeloria.staff.util;

import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

public final class Items {
    private Items() {}

    /** Icône de menu : nom + lignes de description (codes « & »). */
    public static ItemStack icon(Material material, String name, String... lore) {
        ItemStack item = new ItemStack(material);
        ItemMeta meta = item.getItemMeta();
        meta.displayName(Text.of(name));
        List<Component> lines = new ArrayList<>();
        for (String l : lore) lines.add(Text.of(l));
        meta.lore(lines);
        meta.addItemFlags(ItemFlag.values());
        item.setItemMeta(meta);
        return item;
    }

    public static ItemStack filler() {
        return icon(Material.GRAY_STAINED_GLASS_PANE, " ");
    }

    /** Copie de l'objet avec des lignes ajoutées à la fin de son lore. */
    public static ItemStack withLore(ItemStack base, List<String> extra) {
        ItemStack item = base.clone();
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return item;
        List<Component> lore = meta.lore() == null ? new ArrayList<>() : new ArrayList<>(meta.lore());
        for (String l : extra) lore.add(Text.of(l));
        meta.lore(lore);
        item.setItemMeta(meta);
        return item;
    }

    public static boolean isEmpty(ItemStack item) {
        return item == null || item.getType().isAir() || item.getAmount() <= 0;
    }

    /** Format binaire de Paper : conserve tous les composants et migre entre versions de Minecraft. */
    public static String encode(ItemStack item) {
        return Base64.getEncoder().encodeToString(item.serializeAsBytes());
    }

    public static ItemStack decode(String data) {
        return ItemStack.deserializeBytes(Base64.getDecoder().decode(data));
    }
}
