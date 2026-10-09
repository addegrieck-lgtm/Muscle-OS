package fr.vaeloria.fakeplayers.spawn;

/** Accès au terrain pour les déplacements (implémentation Bukkit en jeu, grille dans les tests). */
public interface Terrain {
    /**
     * Hauteur des pieds pour se tenir en (x, z) en venant de la hauteur {@code fromY} : surface solide au plus
     * 1 bloc plus haut (marche, dalle, escalier) et au plus 3 blocs plus bas, avec 2 blocs libres au-dessus.
     * {@link Double#NaN} si c'est impossible (mur, vide, eau, lave…).
     */
    double feet(int x, double fromY, int z);
}
