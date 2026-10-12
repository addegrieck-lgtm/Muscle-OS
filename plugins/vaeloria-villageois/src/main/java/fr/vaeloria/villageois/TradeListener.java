package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import org.bukkit.Material;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.VillagerAcquireTradeEvent;
import org.bukkit.event.entity.VillagerCareerChangeEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MerchantRecipe;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/** Échanges créés par Minecraft : livres tirés dans la table du plugin, robinet d'émeraudes ralenti. */
final class TradeListener implements Listener {
    private final Supplier<Settings> settings;
    private final Boosts boosts;

    TradeListener(Supplier<Settings> settings, Boosts boosts) {
        this.settings = settings;
        this.boosts = boosts;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onAcquire(VillagerAcquireTradeEvent event) {
        if (!(event.getEntity() instanceof Villager v)) return; // marchand ambulant : vanilla
        Settings s = settings.get();
        MerchantRecipe r = event.getRecipe();
        if (Books.isBookTrade(r) && s.replaceVanillaBooks() && v.getProfession() == Villager.Profession.LIBRARIAN) {
            BookOffer offer = s.table().pick(boosts.paid(v), ThreadLocalRandom.current());
            event.setRecipe(Books.recipe(offer, r.getVillagerExperience(), s.requireBook()));
        } else if (r.getResult().getType() == Material.EMERALD && s.emeraldIncomeMultiplier() > 1 && !r.getIngredients().isEmpty()) {
            List<ItemStack> ingredients = new ArrayList<>(r.getIngredients());
            ItemStack first = ingredients.getFirst().clone();
            first.setAmount((int) Math.min(first.getMaxStackSize(), Math.ceil(first.getAmount() * s.emeraldIncomeMultiplier())));
            ingredients.set(0, first);
            MerchantRecipe copy = new MerchantRecipe(r);
            copy.setIngredients(ingredients);
            event.setRecipe(copy);
        }
    }

    /** Nouveau métier ou métier perdu : la chance payée ne suit pas (sinon lutrin cassé = relances gratuites boostées). */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onCareerChange(VillagerCareerChangeEvent event) {
        boosts.reset(event.getEntity());
    }
}
