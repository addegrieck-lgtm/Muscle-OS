package fr.vaeloria.villageois.model;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.random.RandomGenerator;

/**
 * Table de tirage des livres. La chance d'un villageois (nombre de boosts payés, plafonné à {@code maxLuck})
 * déplace le poids des livres courants vers les livres rares.
 */
public final class BookTable {
    private final List<BookOffer> offers;
    private final int maxLuck;

    public BookTable(List<BookOffer> offers, int maxLuck) {
        if (offers.isEmpty()) throw new IllegalArgumentException("aucun livre dans la table");
        this.offers = List.copyOf(offers);
        this.maxLuck = Math.max(0, maxLuck);
        for (int luck = 0; luck <= this.maxLuck; luck++) {
            if (total(luck) <= 0) throw new IllegalArgumentException("tous les poids sont nuls à la chance " + luck);
        }
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
        for (BookOffer o : offers) sum += o.weightAt(luck);
        return sum;
    }

    /** Probabilité (0 à 1) de tirer ce livre après {@code boosts} boosts. */
    public double chance(BookOffer offer, int boosts) {
        int luck = luck(boosts);
        return (double) offer.weightAt(luck) / total(luck);
    }

    public BookOffer pick(int boosts, RandomGenerator random) {
        int luck = luck(boosts);
        int roll = random.nextInt(total(luck));
        for (BookOffer o : offers) {
            roll -= o.weightAt(luck);
            if (roll < 0) return o;
        }
        throw new IllegalStateException("tirage hors table");
    }

    /** Les {@code n} livres les plus chers encore tirables, du plus cher au moins cher. */
    public List<BookOffer> rarest(int boosts, int n) {
        int luck = luck(boosts);
        List<BookOffer> list = new ArrayList<>();
        for (BookOffer o : offers) if (o.weightAt(luck) > 0) list.add(o);
        list.sort(Comparator.comparingInt(BookOffer::price).reversed());
        return list.subList(0, Math.min(n, list.size()));
    }
}
