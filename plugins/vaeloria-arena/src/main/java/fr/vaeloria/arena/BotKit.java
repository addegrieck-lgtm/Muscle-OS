package fr.vaeloria.arena;

import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.inventory.EntityEquipment;
import org.bukkit.inventory.ItemStack;

/** Stuff des bots : armure diamant P4 U3 et épée diamant, niveaux réglables dans config.yml. */
final class BotKit {
    private final int protection;
    private final int unbreaking;
    private final int sharpness;
    private final int fireAspect;

    BotKit(ConfigurationSection bot) {
        this.protection = bot.getInt("protection", 4);
        this.unbreaking = bot.getInt("unbreaking", 3);
        this.sharpness = bot.getInt("sharpness", 5);
        this.fireAspect = bot.getInt("fire-aspect", 0);
    }

    void equip(EntityEquipment eq) {
        eq.setHelmet(armor(new ItemStack(Material.DIAMOND_HELMET)));
        eq.setChestplate(armor(new ItemStack(Material.DIAMOND_CHESTPLATE)));
        eq.setLeggings(armor(new ItemStack(Material.DIAMOND_LEGGINGS)));
        eq.setBoots(armor(new ItemStack(Material.DIAMOND_BOOTS)));
        eq.setItemInMainHand(sword());
        eq.setHelmetDropChance(0f);
        eq.setChestplateDropChance(0f);
        eq.setLeggingsDropChance(0f);
        eq.setBootsDropChance(0f);
        eq.setItemInMainHandDropChance(0f);
        eq.setItemInOffHandDropChance(0f);
    }

    ItemStack sword() {
        ItemStack sword = new ItemStack(Material.DIAMOND_SWORD);
        enchant(sword, Enchantment.SHARPNESS, sharpness);
        enchant(sword, Enchantment.UNBREAKING, unbreaking);
        enchant(sword, Enchantment.FIRE_ASPECT, fireAspect);
        return sword;
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
