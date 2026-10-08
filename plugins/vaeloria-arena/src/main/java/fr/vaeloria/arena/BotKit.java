package fr.vaeloria.arena;

import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.inventory.EntityEquipment;
import org.bukkit.inventory.ItemStack;

/** Stuff des bots : armure diamant P4 U3 et arme (hache diamant Sharpness V par défaut), réglables dans config.yml. */
final class BotKit {
    private final int protection;
    private final int unbreaking;
    private final int sharpness;
    private final int fireAspect;
    private final Material weapon;

    BotKit(ConfigurationSection bot) {
        this.protection = bot.getInt("protection", 4);
        this.unbreaking = bot.getInt("unbreaking", 3);
        this.sharpness = bot.getInt("sharpness", 5);
        this.fireAspect = bot.getInt("fire-aspect", 0);
        Material m = Material.matchMaterial(bot.getString("weapon", "DIAMOND_AXE"));
        this.weapon = m != null && m.isItem() ? m : Material.DIAMOND_AXE;
    }

    void equip(EntityEquipment eq) {
        eq.setHelmet(armor(new ItemStack(Material.DIAMOND_HELMET)));
        eq.setChestplate(armor(new ItemStack(Material.DIAMOND_CHESTPLATE)));
        eq.setLeggings(armor(new ItemStack(Material.DIAMOND_LEGGINGS)));
        eq.setBoots(armor(new ItemStack(Material.DIAMOND_BOOTS)));
        eq.setItemInMainHand(weapon());
        eq.setHelmetDropChance(0f);
        eq.setChestplateDropChance(0f);
        eq.setLeggingsDropChance(0f);
        eq.setBootsDropChance(0f);
        eq.setItemInMainHandDropChance(0f);
        eq.setItemInOffHandDropChance(0f);
    }

    /** « Hache en diamant Tranchant V », traduit dans la langue du joueur. */
    String weaponLabel() {
        String label = "<lang:" + weapon.translationKey() + ">";
        return sharpness > 0 ? label + " <lang:enchantment.minecraft.sharpness> <lang:enchantment.level." + sharpness + ">" : label;
    }

    ItemStack weapon() {
        ItemStack item = new ItemStack(weapon);
        enchant(item, Enchantment.SHARPNESS, sharpness);
        enchant(item, Enchantment.UNBREAKING, unbreaking);
        enchant(item, Enchantment.FIRE_ASPECT, fireAspect);
        return item;
    }

    private ItemStack armor(ItemStack item) {
        enchant(item, Enchantment.PROTECTION, protection);
        enchant(item, Enchantment.UNBREAKING, unbreaking);
        return item;
    }

    private static void enchant(ItemStack item, Enchantment ench, int level) {
        if (level > 0) item.addUnsafeEnchantment(ench, level);
    }
}
