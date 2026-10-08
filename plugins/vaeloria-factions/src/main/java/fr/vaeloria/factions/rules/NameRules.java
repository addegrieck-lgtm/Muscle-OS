package fr.vaeloria.factions.rules;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Validation des noms de faction (le site accepte 2 à 24 caractères). */
public final class NameRules {
    private static final Pattern ALLOWED = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Set<String> RESERVED = Set.of("safezone", "warzone", "nature", "wilderness", "admin", "staff", "vaeloria", "console");

    private NameRules() {}

    public enum Result { OK, TOO_SHORT, TOO_LONG, INVALID_CHARS, RESERVED }

    public static Result validate(String name, int min, int max) {
        if (name == null || name.length() < Math.max(2, min)) return Result.TOO_SHORT;
        if (name.length() > Math.min(24, max)) return Result.TOO_LONG;
        if (!ALLOWED.matcher(name).matches()) return Result.INVALID_CHARS;
        if (RESERVED.contains(name.toLowerCase(Locale.ROOT))) return Result.RESERVED;
        return Result.OK;
    }
}
