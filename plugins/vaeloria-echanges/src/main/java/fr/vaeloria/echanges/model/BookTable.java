package fr.vaeloria.echanges.model;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.random.RandomGenerator;

/**
 * Tirage d'un livre selon la chance du villageois.
 * Poids effectif = poids × (1 + chance × facteur de la rareté) : une chance élevée rend les livres
 * rares, épiques et légendaires plus probables sans jamais rendre les communs impossibles.
 */
public final class BookTable {
    private final List<BookOffer> offers;
    private final Map<Tier, Double> luckFactors;

    public BookTable(List<BookOffer> offers, Map<Tier, Double> luckFactors) {
        this.offers = List.copyOf(offers);
        this.luckFactors = new EnumMap<>(Tier.class);
        this.luckFactors.putAll(luckFactors);
    }

    public List<BookOffer> offers() { return offers; }

    public double weight(BookOffer offer, int luck) {
        if (offer.weight() <= 0) return 0;
        return offer.weight() * (1 + Math.max(0, luck) * luckFactors.getOrDefault(offer.tier(), 0.0));
    }

    /** Livres encore possibles pour ce villageois (ceux qu'il a déjà proposés avant sa capture sont exclus). */
    public List<BookOffer> candidates(Set<String> forbidden) {
        List<BookOffer> out = new ArrayList<>();
        for (BookOffer o : offers) if (o.weight() > 0 && !forbidden.contains(o.id())) out.add(o);
        return out;
    }

    /** Tire un livre, ou null si plus aucun n'est possible. */
    public BookOffer roll(RandomGenerator random, int luck, Set<String> forbidden) {
        List<BookOffer> pool = candidates(forbidden);
        double total = 0;
        for (BookOffer o : pool) total += weight(o, luck);
        if (total <= 0) return null;
        double r = random.nextDouble() * total;
        for (BookOffer o : pool) {
            r -= weight(o, luck);
            if (r < 0) return o;
        }
        return pool.get(pool.size() - 1);
    }

    /** Probabilité (0 à 1) de chaque rareté pour une chance donnée. */
    public Map<Tier, Double> tierOdds(int luck, Set<String> forbidden) {
        Map<Tier, Double> odds = new EnumMap<>(Tier.class);
        double total = 0;
        for (BookOffer o : candidates(forbidden)) {
            double w = weight(o, luck);
            odds.merge(o.tier(), w, Double::sum);
            total += w;
        }
        if (total > 0) for (Tier t : odds.keySet()) odds.put(t, odds.get(t) / total);
        return odds;
    }

    /** Probabilité (0 à 1) d'obtenir précisément ce livre. */
    public double odds(BookOffer offer, int luck, Set<String> forbidden) {
        double total = 0;
        for (BookOffer o : candidates(forbidden)) total += weight(o, luck);
        return total <= 0 || forbidden.contains(offer.id()) ? 0 : weight(offer, luck) / total;
    }

    public static int price(BookOffer offer, RandomGenerator random) {
        return offer.minPrice() + random.nextInt(offer.maxPrice() - offer.minPrice() + 1);
    }
}
