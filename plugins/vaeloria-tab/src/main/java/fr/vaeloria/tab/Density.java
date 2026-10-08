package fr.vaeloria.tab;

/**
 * Bascule du TAB en mode compact quand la liste se remplit. Au-delà de 60 entrées, Minecraft affiche
 * 4 colonnes dont la largeur est celle du nom le plus long : un seul « FONDATEUR │ Pseudo » élargit tout.
 * Hystérésis de {@link #MARGIN} entrées pour ne pas alterner à chaque arrivée ou départ autour du seuil.
 */
final class Density {
    static final int MARGIN = 5;

    private Density() {}

    /** {@code above} ≤ 0 : mode compact désactivé. */
    static boolean compact(boolean current, int entries, int above) {
        if (above <= 0) return false;
        return current ? entries > above - MARGIN : entries > above;
    }
}
