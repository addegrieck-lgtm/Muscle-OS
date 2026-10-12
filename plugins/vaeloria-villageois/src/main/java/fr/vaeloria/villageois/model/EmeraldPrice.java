package fr.vaeloria.villageois.model;

/**
 * Prix en émeraudes d'un échange de villageois. Une case d'échange contient 64 objets au plus :
 * au-delà de 64 émeraudes, le prix passe en blocs d'émeraude (9 émeraudes), arrondi au bloc supérieur.
 *
 * @param emeralds émeraudes demandées (0 si payé en blocs)
 * @param blocks   blocs d'émeraude demandés (0 si payé en émeraudes)
 */
public record EmeraldPrice(int emeralds, int blocks) {
    public static final int MAX = 64 * 9;

    public static EmeraldPrice of(int price) {
        if (price < 1 || price > MAX) throw new IllegalArgumentException("prix hors limites (1 à " + MAX + ") : " + price);
        return price <= 64 ? new EmeraldPrice(price, 0) : new EmeraldPrice(0, (price + 8) / 9);
    }

    /** Valeur réellement payée, en émeraudes. */
    public int total() {
        return emeralds + blocks * 9;
    }
}
