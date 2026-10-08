package fr.vaeloria.tab;

import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;

/** Grade affiché dans la liste. {@code permission} vide = grade par défaut, accordé à tous. */
public record Rank(String key, String permission, int order, String display, String format) {

    public boolean isDefault() {
        return permission == null || permission.isBlank();
    }

    /** Grade d'« order » le plus élevé dont le joueur a la permission, ou {@code null}. */
    public static Rank resolve(List<Rank> ranks, Predicate<String> hasPermission) {
        return ranks.stream()
                .filter(r -> r.isDefault() || hasPermission.test(r.permission()))
                .max(Comparator.comparingInt(Rank::order))
                .orElse(null);
    }
}
