package fr.vaeloria.villageois.model;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.random.RandomGenerator;

/**
 * Table de tirage des livres : d'abord un palier, puis un livre du palier. La chance d'un villageois (boosts payés,
 * plafonnée à {@code maxLuck}) déplace le poids des paliers courants vers les paliers rares.
 */
public final class BookTable {
    private final List<Tier> tiers;
    private final List<BookOffer> offers;
    private final int maxLuck;

    public BookTable(List<Tier> tiers, int maxLuck) {
        if (tiers.isEmpty()) throw new IllegalArgumentException("aucun palier de livres");
        this.tiers = List.copyOf(tiers);
        this.offers = this.tiers.stream().flatMap(t -> t.books().stream()).toList();
        this.maxLuck = Math.max(0, maxLuck);
        for (int luck = 0; luck <= this.maxLuck; luck++) {
            if (total(luck) <= 0) throw new IllegalArgumentException("tous les paliers ont un poids nul à la chance " + luck);
        }
    }

    public List<Tier> tiers() {
        return tiers;
    }

    public List<BookOffer> offers() {
        return offers;
    }

    public int maxLuck() {
        return maxLuck;
    }

    /** Chance effective : les boosts au-delà du plafond ne comptent plus. */
    public int luck(int boosts) {
        return Math.clamp(boosts, 0, maxLuck);
    }

    private int total(int luck) {
        int sum = 0;
        for (Tier t : tiers) sum += t.weightAt(luck);
        return sum;
    }

    private Tier tierOf(BookOffer offer) {
        for (Tier t : tiers) if (t.books().contains(offer)) return t;
        throw new IllegalArgumentException("livre hors table : " + offer.id());
    }

    /** Probabilité (0 à 1) qu'un livre tiré après {@code boosts} boosts soit dans ce palier. */
    public double chance(Tier tier, int boosts) {
        int luck = luck(boosts);
        return (double) tier.weightAt(luck) / total(luck);
    }

    /** Probabilité (0 à 1) de tirer ce livre après {@code boosts} boosts. */
    public double chance(BookOffer offer, int boosts) {
        Tier t = tierOf(offer);
        return chance(t, boosts) * offer.weight() / t.booksWeight();
    }

    public BookOffer pick(int boosts, RandomGenerator random) {
        int luck = luck(boosts);
        int roll = random.nextInt(total(luck));
        for (Tier t : tiers) {
            roll -= t.weightAt(luck);
            if (roll >= 0) continue;
            int r = random.nextInt(t.booksWeight());
            for (BookOffer o : t.books()) {
                r -= o.weight();
                if (r < 0) return o;
            }
        }
        throw new IllegalStateException("tirage hors table");
    }

    /** Les {@code n} livres les plus chers encore tirables, du plus cher au moins cher. */
    public List<BookOffer> rarest(int boosts, int n) {
        List<BookOffer> list = new ArrayList<>();
        for (BookOffer o : offers) if (chance(o, boosts) > 0) list.add(o);
        list.sort(Comparator.comparingInt(BookOffer::price).reversed());
        return list.subList(0, Math.min(n, list.size()));
    }
}
