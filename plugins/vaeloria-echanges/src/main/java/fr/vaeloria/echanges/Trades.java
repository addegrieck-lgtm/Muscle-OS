package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;
import fr.vaeloria.echanges.model.BookTable;
import fr.vaeloria.echanges.model.Expiry;
import fr.vaeloria.echanges.model.Forbidden;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Registry;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.inventory.meta.EnchantmentStorageMeta;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/** Lecture et écriture des livres proposés par un villageois, et de son état (chance, boosts, livres interdits). */
public final class Trades {
    private final VaeloriaEchangesPlugin plugin;

    public Trades(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    private Keys keys() { return plugin.keys(); }
    private Settings settings() { return plugin.settings(); }

    public static Enchantment enchantment(String id) {
        return Registry.ENCHANTMENT.get(NamespacedKey.minecraft(id));
    }

    /** Recette « émeraudes (+ livre) → livre enchanté », insensible aux remises (réputation, Héros du village). */
    public MerchantRecipe recipe(BookOffer offer, int price) {
        ItemStack book = new ItemStack(Material.ENCHANTED_BOOK);
        EnchantmentStorageMeta meta = (EnchantmentStorageMeta) book.getItemMeta();
        meta.addStoredEnchant(enchantment(offer.enchant()), offer.level(), true);
        book.setItemMeta(meta);
        int xp = settings().villagerXp().getOrDefault(offer.tier(), 5);
        MerchantRecipe r = new MerchantRecipe(book, 0, offer.uses(), true, xp, 0f, 0, 0, true);
        r.addIngredient(new ItemStack(Material.EMERALD, price));
        if (settings().requireBook()) r.addIngredient(new ItemStack(Material.BOOK));
        return r;
    }

    public MerchantRecipe roll(BookOffer offer) {
        return recipe(offer, BookTable.price(offer, ThreadLocalRandom.current()));
    }

    public static boolean isBook(MerchantRecipe r) {
        return r.getResult().getType() == Material.ENCHANTED_BOOK;
    }

    /** Identifiants des livres d'une recette (« protection:4 »). */
    public static List<String> bookIds(ItemStack result) {
        List<String> ids = new ArrayList<>();
        if (result.getItemMeta() instanceof EnchantmentStorageMeta meta) {
            for (Map.Entry<Enchantment, Integer> e : meta.getStoredEnchants().entrySet()) {
                ids.add(BookOffer.id(e.getKey().getKey().getKey(), e.getValue()));
            }
        }
        return ids;
    }

    public static List<String> bookIds(Villager v) {
        List<String> ids = new ArrayList<>();
        for (MerchantRecipe r : v.getRecipes()) if (isBook(r)) ids.addAll(bookIds(r.getResult()));
        return ids;
    }

    public static boolean hasBook(Villager v) {
        for (MerchantRecipe r : v.getRecipes()) if (isBook(r)) return true;
        return false;
    }

    /** Remplace le premier livre du villageois (ou l'ajoute s'il n'en propose pas). */
    public static void setBook(Villager v, MerchantRecipe book) {
        List<MerchantRecipe> recipes = new ArrayList<>(v.getRecipes());
        for (int i = 0; i < recipes.size(); i++) {
            if (isBook(recipes.get(i))) {
                recipes.set(i, book);
                v.setRecipes(recipes);
                return;
            }
        }
        recipes.add(book);
        v.setRecipes(recipes);
    }

    // ── État du villageois ───────────────────────────────────────────

    public int luck(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().luck, PersistentDataType.INTEGER, 0); }
    public int boosts(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().boosts, PersistentDataType.INTEGER, 0); }
    public String forbiddenRaw(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().forbidden, PersistentDataType.STRING, ""); }
    public Set<String> forbidden(Villager v) { return Forbidden.parse(forbiddenRaw(v)); }
    public boolean needsBoost(Villager v) { return v.getPersistentDataContainer().has(keys().needsBoost); }

    public boolean exhausted(Villager v) { return v.getPersistentDataContainer().has(keys().exhausted); }
    public int sales(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().bookSales, PersistentDataType.INTEGER, 0); }
    public int salesLimit(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().bookLimit, PersistentDataType.INTEGER, 0); }
    public long expiresAt(Villager v) { return v.getPersistentDataContainer().getOrDefault(keys().bookExpires, PersistentDataType.LONG, 0L); }

    /** Nouveau livre : son délai de vie et son compteur de ventes repartent de zéro. */
    public void startBook(Villager v, int salesLimit) {
        PersistentDataContainer pdc = v.getPersistentDataContainer();
        long expires = Expiry.expiresAt(System.currentTimeMillis(), settings().bookLifetimeHours());
        if (expires > 0) pdc.set(keys().bookExpires, PersistentDataType.LONG, expires);
        else pdc.remove(keys().bookExpires);
        pdc.set(keys().bookSales, PersistentDataType.INTEGER, 0);
        pdc.set(keys().bookLimit, PersistentDataType.INTEGER, salesLimit);
        pdc.remove(keys().exhausted);
    }

    /** Compte une vente du livre ; renvoie true si c'était la dernière. */
    public boolean recordSale(Villager v) {
        int sales = sales(v) + 1;
        v.getPersistentDataContainer().set(keys().bookSales, PersistentDataType.INTEGER, sales);
        return salesLimit(v) > 0 && sales >= salesLimit(v);
    }

    public boolean salesDone(Villager v) {
        return salesLimit(v) > 0 && sales(v) >= salesLimit(v);
    }

    /**
     * Fait disparaître le livre s'il a fait son temps ou toutes ses ventes. Le villageois est alors épuisé :
     * plus de livre ni de boost tant qu'il n'a pas été capturé et relâché. Renvoie true si le livre vient de disparaître.
     */
    public boolean expireIfDue(Villager v) {
        if (!hasBook(v) || v.isTrading()) return false;
        PersistentDataContainer pdc = v.getPersistentDataContainer();
        if (!pdc.has(keys().bookLimit)) {
            // Livre antérieur à cette règle : son délai démarre maintenant.
            for (MerchantRecipe r : v.getRecipes()) if (isBook(r)) startBook(v, r.getMaxUses());
            return false;
        }
        if (!Expiry.due(System.currentTimeMillis(), expiresAt(v), sales(v), salesLimit(v))) return false;
        // Le livre disparu rejoint les livres interdits : ce villageois ne le reproposera jamais.
        pdc.set(keys().forbidden, PersistentDataType.STRING,
                Forbidden.merge(forbiddenRaw(v), bookIds(v), settings().maxForbidden()));
        List<MerchantRecipe> kept = new ArrayList<>();
        for (MerchantRecipe r : v.getRecipes()) if (!isBook(r)) kept.add(r);
        v.setRecipes(kept);
        pdc.remove(keys().bookExpires);
        pdc.remove(keys().bookSales);
        pdc.remove(keys().bookLimit);
        pdc.set(keys().exhausted, PersistentDataType.BYTE, (byte) 1);
        return true;
    }

    public void setBoostState(Villager v, int luck, int boosts) {
        PersistentDataContainer pdc = v.getPersistentDataContainer();
        pdc.set(keys().luck, PersistentDataType.INTEGER, luck);
        pdc.set(keys().boosts, PersistentDataType.INTEGER, boosts);
        pdc.remove(keys().needsBoost);
    }
}
