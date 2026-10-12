package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import fr.vaeloria.villageois.model.EmeraldPrice;
import io.papermc.paper.registry.RegistryAccess;
import io.papermc.paper.registry.RegistryKey;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.inventory.meta.EnchantmentStorageMeta;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Livres, échanges et émeraudes. */
final class Books {
    private static final ItemStack EMERALD = new ItemStack(Material.EMERALD);

    private Books() {}

    static Enchantment enchantment(String key) {
        NamespacedKey k = NamespacedKey.fromString(key.toLowerCase(Locale.ROOT));
        return k == null ? null : RegistryAccess.registryAccess().getRegistry(RegistryKey.ENCHANTMENT).get(k);
    }

    static ItemStack book(BookOffer offer) {
        ItemStack item = new ItemStack(Material.ENCHANTED_BOOK);
        EnchantmentStorageMeta meta = (EnchantmentStorageMeta) item.getItemMeta();
        meta.addStoredEnchant(enchantment(offer.enchant()), offer.level(), true);
        item.setItemMeta(meta);
        return item;
    }

    /** Échange du bibliothécaire : réductions ignorées, pour que le soin de zombie ne brade pas un Protection IV. */
    static MerchantRecipe recipe(BookOffer offer, int villagerXp, boolean requireBook) {
        EmeraldPrice price = EmeraldPrice.of(offer.price());
        MerchantRecipe r = new MerchantRecipe(book(offer), 0, offer.maxUses(), true, villagerXp, 0.05f, 0, 0, true);
        List<ItemStack> ingredients = new ArrayList<>();
        ingredients.add(price.blocks() > 0 ? new ItemStack(Material.EMERALD_BLOCK, price.blocks()) : new ItemStack(Material.EMERALD, price.emeralds()));
        if (requireBook) ingredients.add(new ItemStack(Material.BOOK));
        r.setIngredients(ingredients);
        return r;
    }

    static boolean isBookTrade(MerchantRecipe r) {
        return r.getResult().getType() == Material.ENCHANTED_BOOK;
    }

    /** « <lang:enchantment.minecraft.protection> IV » : nom traduit dans la langue du joueur. */
    static String name(BookOffer offer) {
        Enchantment e = enchantment(offer.enchant());
        String base = e == null ? Text.esc(offer.enchant()) : "<lang:" + translationKey(e) + ">";
        return e != null && e.getMaxLevel() == 1 && offer.level() == 1 ? base : base + " " + roman(offer.level());
    }

    /** Nom d'un livre déjà en vente (échange vanilla compris). */
    static String name(ItemStack book) {
        if (!(book.getItemMeta() instanceof EnchantmentStorageMeta meta) || !meta.hasStoredEnchants()) return "<lang:item.minecraft.enchanted_book>";
        List<String> parts = new ArrayList<>();
        for (Map.Entry<Enchantment, Integer> en : meta.getStoredEnchants().entrySet()) {
            Enchantment e = en.getKey();
            parts.add("<lang:" + translationKey(e) + ">" + (e.getMaxLevel() == 1 ? "" : " " + roman(en.getValue())));
        }
        return String.join(", ", parts);
    }

    /** « enchantment.minecraft.protection » : clé de traduction du client. */
    static String translationKey(Enchantment e) {
        NamespacedKey k = e.getKey();
        return "enchantment." + k.getNamespace() + "." + k.getKey();
    }

    static String roman(int n) {
        return switch (n) {
            case 1 -> "I"; case 2 -> "II"; case 3 -> "III"; case 4 -> "IV"; case 5 -> "V";
            case 6 -> "VI"; case 7 -> "VII"; case 8 -> "VIII"; case 9 -> "IX"; case 10 -> "X";
            default -> String.valueOf(n);
        };
    }

    /** Émeraudes simples de l'inventaire (une émeraude renommée ou d'un autre plugin ne compte pas). */
    static int emeralds(Player player) {
        int n = 0;
        for (ItemStack it : player.getInventory().getStorageContents()) if (it != null && it.isSimilar(EMERALD)) n += it.getAmount();
        return n;
    }

    static boolean takeEmeralds(Player player, int amount) {
        if (emeralds(player) < amount) return false;
        return player.getInventory().removeItem(new ItemStack(Material.EMERALD, amount)).isEmpty();
    }

    /** Donne au joueur, le surplus tombe à ses pieds. */
    static void give(Player player, ItemStack item) {
        for (ItemStack left : player.getInventory().addItem(item).values()) {
            player.getWorld().dropItemNaturally(player.getLocation(), left);
        }
    }
}
