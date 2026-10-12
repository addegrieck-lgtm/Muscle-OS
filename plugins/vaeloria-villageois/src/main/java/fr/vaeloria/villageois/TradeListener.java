package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import io.papermc.paper.event.player.PlayerTradeEvent;
import org.bukkit.Material;
import org.bukkit.entity.HumanEntity;
import org.bukkit.entity.Villager;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.VillagerAcquireTradeEvent;
import org.bukkit.event.entity.VillagerCareerChangeEvent;
import org.bukkit.event.entity.VillagerReplenishTradeEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.plugin.Plugin;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/** Échanges des villageois : livres tirés dans la table du plugin, usure, robinet d'émeraudes ralenti. */
final class TradeListener implements Listener {
    static final String EXHAUSTED = "<loss>Ce bibliothécaire est épuisé.</loss> <silver>Capture-le et relâche-le pour le relancer à zéro.</silver>";

    private final Plugin plugin;
    private final Supplier<Settings> settings;
    private final Boosts boosts;
    private final WearTracker wear;

    TradeListener(Plugin plugin, Supplier<Settings> settings, Boosts boosts, WearTracker wear) {
        this.plugin = plugin;
        this.settings = settings;
        this.boosts = boosts;
        this.wear = wear;
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onAcquire(VillagerAcquireTradeEvent event) {
        if (!(event.getEntity() instanceof Villager v)) return; // marchand ambulant : vanilla
        Settings s = settings.get();
        MerchantRecipe r = event.getRecipe();
        if (Books.isBookTrade(r) && s.replaceVanillaBooks() && v.getProfession() == Villager.Profession.LIBRARIAN) {
            BookOffer offer = s.table().pick(boosts.paid(v), ThreadLocalRandom.current());
            MerchantRecipe book = Books.recipe(offer, r.getVillagerExperience(), s.requireBook());
            if (wear.exhausted(v)) book.setUses(book.getMaxUses());
            event.setRecipe(book);
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

    /** Villageois épuisé : aucun livre ne se vend plus, même avec la fenêtre d'échange déjà ouverte. */
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onBuy(PlayerTradeEvent event) {
        if (event.getVillager() instanceof Villager v && Books.isBookTrade(event.getTrade()) && wear.exhausted(v)) {
            event.setCancelled(true);
            event.getPlayer().sendActionBar(Text.mm(EXHAUSTED));
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBought(PlayerTradeEvent event) {
        if (!(event.getVillager() instanceof Villager v) || !Books.isBookTrade(event.getTrade())) return;
        if (!wear.recordSale(v)) return;
        event.getPlayer().sendMessage(Text.prefixed("<silver>Ce bibliothécaire a vendu son dernier livre (" + wear.sold(v) + " au total).</silver> " + EXHAUSTED));
        // Le tick suivant, une fois l'échange terminé : fenêtre fermée et livres affichés en rupture.
        plugin.getServer().getScheduler().runTask(plugin, () -> {
            if (!v.isValid()) return;
            HumanEntity trader = v.getTrader();
            if (trader != null) trader.closeInventory();
            wear.lockBooks(v);
        });
    }

    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onReplenish(VillagerReplenishTradeEvent event) {
        if (event.getEntity() instanceof Villager v && Books.isBookTrade(event.getRecipe()) && wear.exhausted(v)) event.setCancelled(true);
    }

    /** Nouveau métier ou métier perdu : la chance payée ne suit pas (sinon lutrin cassé = relances gratuites boostées). */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onCareerChange(VillagerCareerChangeEvent event) {
        boosts.reset(event.getEntity());
    }
}
