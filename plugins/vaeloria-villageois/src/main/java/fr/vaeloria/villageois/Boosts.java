package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import org.bukkit.Bukkit;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.persistence.PersistentDataType;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/**
 * Boost d'un bibliothécaire : le joueur paie des émeraudes, les livres que personne n'a encore achetés sont relancés
 * et le villageois gagne 1 niveau de chance. La chance est perdue s'il change de métier (lutrin cassé, capture).
 */
final class Boosts {
    enum Outcome { DONE, NOT_LIBRARIAN, BUSY, EXHAUSTED, NOTHING_TO_REROLL, NOT_ENOUGH }

    record Result(Outcome outcome, int cost, List<BookOffer> drawn) {}

    private final Keys keys;
    private final Supplier<Settings> settings;
    private final WearTracker wear;

    Boosts(Keys keys, Supplier<Settings> settings, WearTracker wear) {
        this.keys = keys;
        this.settings = settings;
        this.wear = wear;
    }

    Keys keys() {
        return keys;
    }

    int paid(Villager v) {
        return v.getPersistentDataContainer().getOrDefault(keys.boosts, PersistentDataType.INTEGER, 0);
    }

    int luck(Villager v) {
        return settings.get().table().luck(paid(v));
    }

    int nextCost(Villager v) {
        return settings.get().boostCost().forBoost(paid(v));
    }

    void reset(Villager v) {
        v.getPersistentDataContainer().remove(keys.boosts);
        v.getPersistentDataContainer().remove(keys.bookAdded);
    }

    /** Indices des livres relançables : jamais achetés. Un livre acheté au moins une fois est verrouillé. */
    static List<Integer> rerollable(List<MerchantRecipe> recipes) {
        List<Integer> idx = new ArrayList<>();
        for (int i = 0; i < recipes.size(); i++) {
            if (Books.isBookTrade(recipes.get(i)) && recipes.get(i).getUses() == 0) idx.add(i);
        }
        return idx;
    }

    Result boost(Player player, Villager v) {
        Settings s = settings.get();
        if (v.getProfession() != Villager.Profession.LIBRARIAN) return new Result(Outcome.NOT_LIBRARIAN, 0, List.of());
        if (v.isTrading()) return new Result(Outcome.BUSY, 0, List.of());
        if (wear.exhausted(v)) return new Result(Outcome.EXHAUSTED, 0, List.of());

        List<MerchantRecipe> recipes = new ArrayList<>(v.getRecipes());
        List<Integer> targets = rerollable(recipes);
        boolean hasBook = recipes.stream().anyMatch(Books::isBookTrade);
        boolean added = v.getPersistentDataContainer().has(keys.bookAdded);
        boolean addBook = targets.isEmpty() && !hasBook && s.addBookIfNone() && !added;
        if (targets.isEmpty() && !addBook) return new Result(Outcome.NOTHING_TO_REROLL, 0, List.of());

        int paid = paid(v);
        int cost = s.boostCost().forBoost(paid);
        if (!Books.takeEmeralds(player, cost)) return new Result(Outcome.NOT_ENOUGH, cost, List.of());

        int boosts = paid + 1;
        v.getPersistentDataContainer().set(keys.boosts, PersistentDataType.INTEGER, boosts);
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        List<BookOffer> drawn = new ArrayList<>();
        for (int i : targets) {
            BookOffer offer = s.table().pick(boosts, rnd);
            recipes.set(i, Books.recipe(offer, recipes.get(i).getVillagerExperience(), s.requireBook()));
            drawn.add(offer);
        }
        if (addBook) {
            BookOffer offer = s.table().pick(boosts, rnd);
            recipes.add(Books.recipe(offer, 1, s.requireBook()));
            v.getPersistentDataContainer().set(keys.bookAdded, PersistentDataType.BOOLEAN, true);
            drawn.add(offer);
        }
        v.setRecipes(recipes);

        boolean rare = drawn.stream().anyMatch(BookOffer::announce);
        v.getWorld().spawnParticle(rare ? Particle.TOTEM_OF_UNDYING : Particle.HAPPY_VILLAGER,
                v.getLocation().add(0, 1.2, 0), rare ? 40 : 15, 0.4, 0.6, 0.4, rare ? 0.3 : 0);
        v.getWorld().playSound(v.getLocation(), rare ? Sound.UI_TOAST_CHALLENGE_COMPLETE : Sound.ENTITY_VILLAGER_CELEBRATE, 1f, 1f);
        for (BookOffer o : drawn) {
            if (o.announce()) Bukkit.broadcast(Text.prefixed("<snow>" + Text.esc(player.getName()) + "</snow> <silver>a fait sortir</silver> <gold>"
                    + Books.name(o) + "</gold> <silver>chez un bibliothécaire, à force de le booster !</silver>"));
        }
        return new Result(Outcome.DONE, cost, drawn);
    }
}
