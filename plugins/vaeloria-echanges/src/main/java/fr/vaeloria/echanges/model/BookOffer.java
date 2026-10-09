package fr.vaeloria.echanges.model;

/**
 * Une ligne de la table des livres. {@code enchant} est l'identifiant Minecraft (ex. « protection »),
 * le prix est tiré entre {@code minPrice} et {@code maxPrice} émeraudes.
 */
public record BookOffer(String enchant, int level, Tier tier, int weight, int minPrice, int maxPrice, int uses) {
    /** Prix maximal d'un échange : une pile d'émeraudes. */
    public static final int MAX_PRICE = 64;

    public BookOffer {
        if (minPrice < 1 || maxPrice > MAX_PRICE || minPrice > maxPrice) {
            throw new IllegalArgumentException("prix invalide pour " + enchant + " " + level + " : [" + minPrice + ", " + maxPrice + "]");
        }
        if (level < 1) throw new IllegalArgumentException("niveau invalide pour " + enchant + " : " + level);
        if (uses < 1) throw new IllegalArgumentException("uses invalide pour " + enchant + " : " + uses);
    }

    /** Clé unique d'un livre, mémorisée pour qu'un villageois relâché ne le repropose jamais : « protection:4 ». */
    public String id() { return id(enchant, level); }

    public static String id(String enchant, int level) { return enchant + ":" + level; }
}
