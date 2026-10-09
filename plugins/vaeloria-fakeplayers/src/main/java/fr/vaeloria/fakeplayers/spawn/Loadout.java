package fr.vaeloria.fakeplayers.spawn;

import org.bukkit.Material;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.inventory.ItemStack;

import java.util.Locale;
import java.util.Random;

/**
 * Équipement visible d'un bot, toujours le même pour un même pseudo : de rien du tout au full netherite enchanté,
 * avec ce qu'on tient souvent en main au spawn (épée, pommes, perles, nourriture, blocs).
 */
record Loadout(ItemStack helmet, ItemStack chest, ItemStack legs, ItemStack boots, ItemStack mainHand, ItemStack offHand) {

    static Loadout of(String name) {
        Random r = new Random(name.toLowerCase(Locale.ROOT).hashCode() * 131L + 17);
        double roll = r.nextDouble();
        String tier = roll < 0.18 ? null : roll < 0.30 ? "LEATHER" : roll < 0.40 ? "CHAINMAIL" : roll < 0.68 ? "IRON"
                : roll < 0.92 ? "DIAMOND" : "NETHERITE";
        boolean enchanted = tier != null && (tier.equals("DIAMOND") || tier.equals("NETHERITE")) && r.nextDouble() < 0.6;
        // Une pièce manque parfois (casque surtout), comme chez beaucoup de joueurs.
        ItemStack helmet = piece(tier, "HELMET", r.nextDouble() < 0.25, enchanted);
        ItemStack chest = piece(tier, "CHESTPLATE", false, enchanted);
        ItemStack legs = piece(tier, "LEGGINGS", r.nextDouble() < 0.1, enchanted);
        ItemStack boots = piece(tier, "BOOTS", r.nextDouble() < 0.15, enchanted);
        String[] hands = {"SWORD", "SWORD", "SWORD", "GOLDEN_APPLE", "ENDER_PEARL", "COOKED_BEEF", "BREAD", "AIR",
                "COBBLESTONE", "BOW", "PICKAXE"};
        String hand = hands[r.nextInt(hands.length)];
        String toolTier = tier == null || tier.equals("LEATHER") || tier.equals("CHAINMAIL") ? "STONE" : tier;
        ItemStack main = switch (hand) {
            case "SWORD", "PICKAXE" -> enchant(new ItemStack(Material.valueOf(toolTier + "_" + hand)), enchanted);
            case "AIR" -> null;
            default -> new ItemStack(Material.valueOf(hand), hand.equals("BOW") ? 1 : 1 + r.nextInt(16));
        };
        ItemStack off = r.nextDouble() < 0.2 ? new ItemStack(r.nextBoolean() ? Material.SHIELD : Material.TOTEM_OF_UNDYING) : null;
        return new Loadout(helmet, chest, legs, boots, main, off);
    }

    private static ItemStack piece(String tier, String part, boolean missing, boolean enchanted) {
        if (tier == null || missing) return null;
        return enchant(new ItemStack(Material.valueOf(tier + "_" + part)), enchanted);
    }

    /** Un enchantement suffit pour l'effet brillant. */
    private static ItemStack enchant(ItemStack item, boolean enchanted) {
        if (enchanted) item.addUnsafeEnchantment(Enchantment.UNBREAKING, 3);
        return item;
    }
}
