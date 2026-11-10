package fr.vaeloria.crates.util;

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

    /**
     * Objet décrit à la main dans crates.yml (format lisible, réécrit en binaire à la première sauvegarde) :
     * <pre>
     * item:
     *   material: DIAMOND_SWORD
     *   amount: 1
     *   name: "&b&lÉpée du vote"
     *   lore: ["&7Ligne 1", "&7Ligne 2"]
     *   enchants: {sharpness: 4, unbreaking: 3}
     *   glow: true          # brillance sans enchantement visible
     * </pre>
     */
    public static ItemStack fromSection(org.bukkit.configuration.ConfigurationSection s) {
        Material material = Material.matchMaterial(s.getString("material", "STONE"));
        if (material == null || !material.isItem()) throw new IllegalArgumentException("matériau inconnu : " + s.getString("material"));
        ItemStack item = new ItemStack(material, Math.max(1, Math.min(s.getInt("amount", 1), material.getMaxStackSize())));
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return item;
        if (s.contains("name")) meta.displayName(Text.of(s.getString("name")));
        if (s.contains("lore")) {
            List<Component> lore = new ArrayList<>();
            for (String l : s.getStringList("lore")) lore.add(Text.of(l));
            meta.lore(lore);
        }
        org.bukkit.configuration.ConfigurationSection ench = s.getConfigurationSection("enchants");
        if (ench != null) {
            for (String key : ench.getKeys(false)) {
                var e = org.bukkit.Registry.ENCHANTMENT.get(org.bukkit.NamespacedKey.minecraft(key.toLowerCase(java.util.Locale.ROOT)));
                if (e == null) throw new IllegalArgumentException("enchantement inconnu : " + key);
                meta.addEnchant(e, Math.max(1, ench.getInt(key, 1)), true);
            }
        }
        if (s.getBoolean("glow", false)) meta.setEnchantmentGlintOverride(true);
        item.setItemMeta(meta);
        return item;
    }

    /** « item » / « key » : chaîne encodée (format binaire) ou section lisible (voir {@link #fromSection}). */
    public static ItemStack read(org.bukkit.configuration.ConfigurationSection parent, String path) {
        org.bukkit.configuration.ConfigurationSection s = parent.getConfigurationSection(path);
        if (s != null) return fromSection(s);
        String data = parent.getString(path);
        return data == null ? null : decode(data);
    }
}
