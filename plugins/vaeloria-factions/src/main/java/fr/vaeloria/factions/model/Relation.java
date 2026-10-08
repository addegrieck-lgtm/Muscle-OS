package fr.vaeloria.factions.model;

/**
 * Relations entre factions, de la plus hostile à la plus amicale.
 * Chaque faction exprime un « souhait » envers une autre ; la relation effective est le souhait le plus hostile
 * des deux : il suffit d'un camp pour déclarer la guerre, il en faut deux pour une alliance.
 */
public enum Relation {
    ENNEMI("Ennemi", "red"),
    NEUTRE("Neutre", "white"),
    TREVE("Trêve", "aqua"),
    ALLIE("Allié", "light_purple"),
    /** Même faction : jamais stocké comme souhait. */
    MEMBRE("Membre", "green");

    private final String label;
    private final String color;

    Relation(String label, String color) {
        this.label = label;
        this.color = color;
    }

    public String label() { return label; }
    /** Couleur MiniMessage associée. */
    public String color() { return color; }

    public boolean isFriendly() { return this == ALLIE || this == TREVE || this == MEMBRE; }

    public static Relation resolve(Relation wishA, Relation wishB) {
        Relation a = wishA == null ? NEUTRE : wishA;
        Relation b = wishB == null ? NEUTRE : wishB;
        return a.ordinal() <= b.ordinal() ? a : b;
    }

    public static Relation parse(String s) {
        if (s == null) return null;
        String n = java.text.Normalizer.normalize(s.trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT);
        return switch (n) {
            case "ENNEMI", "ENEMY" -> ENNEMI;
            case "NEUTRE", "NEUTRAL" -> NEUTRE;
            case "TREVE", "TRUCE" -> TREVE;
            case "ALLIE", "ALLY" -> ALLIE;
            default -> null;
        };
    }
}
