package fr.vaeloria.villageois.model;

import java.util.List;

/**
 * Palier de livres. Son poids évolue avec la chance du villageois : {@code weight + perBoost × chance}, jamais négatif.
 */
public record Tier(String name, int weight, int perBoost, List<BookOffer> books) {
    public Tier {
        books = List.copyOf(books);
        if (books.isEmpty()) throw new IllegalArgumentException("palier " + name + " sans livre");
        if (books.stream().mapToInt(BookOffer::weight).sum() <= 0) throw new IllegalArgumentException("palier " + name + " : poids des livres nuls");
    }

    public int weightAt(int luck) {
        return Math.max(0, weight + perBoost * luck);
    }

    int booksWeight() {
        return books.stream().mapToInt(BookOffer::weight).sum();
    }
}
