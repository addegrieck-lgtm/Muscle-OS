package fr.vaeloria.tab;

import java.util.Comparator;
import java.util.List;
import java.util.function.Predicate;

/**
 * Grade affiché dans la liste, le chat et les annonces. {@code permission} vide = grade par défaut, accordé à tous.
 * {@code compact}, {@code chat}, {@code join} et {@code quit} sont facultatifs ({@code null} = format
 * commun de config.yml ; pour {@code compact}, le format normal).
 */
public record Rank(String key, String permission, int order, String display, String format, String compact,
                   String chat, String join, String quit) {

    public Rank(String key, String permission, int order, String display, String format) {
        this(key, permission, order, display, format, null, null, null, null);
    }

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

    /** Format propre au grade s'il existe, sinon le format commun. */
    static String or(String own, String common) {
        return own == null || own.isBlank() ? common : own;
    }
}
