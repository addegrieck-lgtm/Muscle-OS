package fr.vaeloria.echanges.model;

/** Rareté d'un livre : règle l'effet de la chance et l'annonce faite au joueur. */
public enum Tier {
    COMMUN("&7Commun"),
    RARE("&9Rare"),
    EPIQUE("&5Épique"),
    LEGENDAIRE("&6&lLégendaire");

    private final String label;

    Tier(String label) { this.label = label; }

    public String label() { return label; }
}
