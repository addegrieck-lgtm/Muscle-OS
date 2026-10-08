package fr.vaeloria.fakeplayers;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/**
 * Choix des pseudos des faux joueurs : d'abord la liste configurée, puis des pseudos générés
 * (préfixe + suffixe + chiffres) une fois la liste épuisée. Indépendant de Bukkit pour être testable.
 */
public final class NamePool {
    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9_]{3,16}$");
    private static final String[] PREFIXES = {"Dark", "Shadow", "Iron", "Blaze", "Frost", "Storm", "Night", "Wolf",
            "Lord", "Silent", "Red", "Toxic", "Ghost", "Crazy", "Mister", "Epic", "Lucky", "Swift", "Void", "Ender"};
    private static final String[] SUFFIXES = {"Hunter", "Knight", "Slayer", "Gamer", "Wolf", "Blade", "Fox", "King",
            "Miner", "Archer", "Ninja", "Dragon", "Pvp", "Craft", "Lion", "Viper", "Raven", "Titan", "Bear", "Storm"};

    private final List<String> configured;
    private final Random random;

    public NamePool(Collection<String> configured, Random random) {
        this.configured = new ArrayList<>();
        for (String name : configured) if (isValid(name)) this.configured.add(name);
        this.random = random;
    }

    public static boolean isValid(String name) {
        return name != null && VALID.matcher(name).matches();
    }

    /**
     * Retourne un pseudo libre (comparaison insensible à la casse), ou null si aucun n'a été trouvé.
     * @param taken pseudos (en minuscules) déjà utilisés par de vrais ou faux joueurs
     */
    public String next(Set<String> taken) {
        Predicate<String> free = n -> !taken.contains(n.toLowerCase(Locale.ROOT));
        List<String> candidates = new ArrayList<>();
        for (String name : configured) if (free.test(name)) candidates.add(name);
        if (!candidates.isEmpty()) return candidates.get(random.nextInt(candidates.size()));
        for (int attempt = 0; attempt < 200; attempt++) {
            String name = generate();
            if (isValid(name) && free.test(name)) return name;
        }
        return null;
    }

    String generate() {
        StringBuilder sb = new StringBuilder(PREFIXES[random.nextInt(PREFIXES.length)]);
        int style = random.nextInt(4);
        if (style == 1) sb.append('_');
        sb.append(SUFFIXES[random.nextInt(SUFFIXES.length)]);
        if (style >= 2) sb.append(random.nextInt(style == 2 ? 100 : 10000));
        return sb.length() > 16 ? sb.substring(0, 16) : sb.toString();
    }
}
