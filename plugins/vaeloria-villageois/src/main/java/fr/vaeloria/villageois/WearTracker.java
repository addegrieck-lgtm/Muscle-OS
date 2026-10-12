package fr.vaeloria.villageois;

import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Usure des bibliothécaires : chaque livre vendu est compté. À la limite du villageois (tirée une fois entre
 * wear.books-min et wear.books-max), il est épuisé : plus de livre à vendre, plus de réapprovisionnement, plus de
 * boost. Seule la capture le relance (le villageois relâché est une nouvelle entité, à zéro).
 */
final class WearTracker {
    private final Keys keys;
    private final Supplier<Settings> settings;

    WearTracker(Keys keys, Supplier<Settings> settings) {
        this.keys = keys;
        this.settings = settings;
    }

    int sold(Villager v) {
        return v.getPersistentDataContainer().getOrDefault(keys.booksSold, PersistentDataType.INTEGER, 0);
    }

    /** Limite du villageois, tirée au premier livre vendu puis gardée : la config peut changer sans tout relancer. */
    int limit(Villager v) {
        PersistentDataContainer pdc = v.getPersistentDataContainer();
        Integer limit = pdc.get(keys.bookLimit, PersistentDataType.INTEGER);
        if (limit == null) {
            limit = settings.get().wear().drawLimit(ThreadLocalRandom.current());
            pdc.set(keys.bookLimit, PersistentDataType.INTEGER, limit);
        }
        return limit;
    }

    boolean exhausted(Villager v) {
        return settings.get().wear().enabled() && v.getPersistentDataContainer().has(keys.exhausted);
    }

    /** Compte une vente de livre. Vrai si ce livre vient d'épuiser le villageois. */
    boolean recordSale(Villager v) {
        int sold = sold(v) + 1;
        v.getPersistentDataContainer().set(keys.booksSold, PersistentDataType.INTEGER, sold);
        if (exhausted(v) || !settings.get().wear().exhausted(sold, limit(v))) return false;
        v.getPersistentDataContainer().set(keys.exhausted, PersistentDataType.BOOLEAN, true);
        v.getWorld().spawnParticle(Particle.LARGE_SMOKE, v.getLocation().add(0, 1.4, 0), 20, 0.3, 0.4, 0.3, 0.01);
        v.getWorld().playSound(v.getLocation(), Sound.ENTITY_VILLAGER_NO, 1f, 0.7f);
        return true;
    }

    /** Livres en rupture de stock (affichés barrés dans les échanges). À appeler quand personne ne commerce. */
    void lockBooks(Villager v) {
        List<MerchantRecipe> recipes = new ArrayList<>(v.getRecipes());
        for (MerchantRecipe r : recipes) if (Books.isBookTrade(r)) r.setUses(r.getMaxUses());
        v.setRecipes(recipes);
    }
}
