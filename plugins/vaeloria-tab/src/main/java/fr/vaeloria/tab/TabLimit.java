package fr.vaeloria.tab;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Plafond d'entrées dans le TAB : chaque joueur se voit toujours lui-même, puis les autres dans l'ordre
 * donné (grade le plus haut d'abord), jusqu'à {@code max}. Les suivants sont retirés de sa liste
 * (ils restent connectés et visibles en jeu).
 */
final class TabLimit {
    private TabLimit() {}

    /** {@code max} ≤ 0 : pas de plafond. */
    static <T> Set<T> shown(List<T> ordered, T viewer, int max) {
        Set<T> shown = new LinkedHashSet<>();
        if (max <= 0) {
            shown.addAll(ordered);
            return shown;
        }
        if (ordered.contains(viewer)) shown.add(viewer);
        for (T t : ordered) {
            if (shown.size() >= max) break;
            shown.add(t);
        }
        return shown;
    }
}
