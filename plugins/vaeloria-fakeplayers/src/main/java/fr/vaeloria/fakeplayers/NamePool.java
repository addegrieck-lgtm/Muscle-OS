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
 * (prénoms, mots, chiffres, tags… dans des styles variés) une fois la liste épuisée. Indépendant de Bukkit pour être testable.
 */
public final class NamePool {
    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9_]{3,16}$");
    private static final String[] PREFIXES = {"Dark", "Shadow", "Iron", "Blaze", "Frost", "Storm", "Night", "Wolf",
            "Lord", "Silent", "Red", "Toxic", "Ghost", "Crazy", "Mister", "Epic", "Lucky", "Swift", "Void", "Ender"};
    private static final String[] SUFFIXES = {"Hunter", "Knight", "Slayer", "Gamer", "Wolf", "Blade", "Fox", "King",
            "Miner", "Archer", "Ninja", "Dragon", "Pvp", "Craft", "Lion", "Viper", "Raven", "Titan", "Bear", "Storm"};
    private static final String[] FIRST_NAMES = {"Lucas", "Theo", "Hugo", "Nathan", "Enzo", "Louis", "Gabriel", "Arthur",
            "Jules", "Mael", "Noah", "Tom", "Leo", "Adam", "Ethan", "Rayan", "Sacha", "Nolan", "Timeo", "Mathis",
            "Kylian", "Axel", "Evan", "Liam", "Matteo", "Romain", "Kevin", "Maxime", "Antoine", "Baptiste",
            "Clement", "Alexis", "Quentin", "Dylan", "Yanis", "Ilyes", "Emma", "Lea", "Jade", "Chloe", "Ines",
            "Manon", "Camille", "Sarah", "Lina", "Zoe", "Lola", "Eva", "Julie", "Mathilde"};
    private static final String[] WORDS = {"Pixel", "Creeper", "Kraken", "Panda", "Tigre", "Loup", "Requin", "Faucon",
            "Cobra", "Phoenix", "Spartan", "Viking", "Samurai", "Pirate", "Zombie", "Cactus", "Patate", "Nuage",
            "Eclair", "Tonnerre", "Obsidian", "Netherite", "Redstone", "Diamond", "Emerald", "Golem", "Wither",
            "Sniper", "Rush", "Nova", "Blitz", "Chaos", "Venom", "Zenith", "Onyx", "Krypto", "Turbo", "Mango",
            "Kiwi", "Cookie"};
    private static final String[] TAGS = {"FR", "YT", "TTV", "Pvp", "Off", "Off", "MC", "Gaming", "Dz", "Btw"};

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

    /** Pseudo au hasard, dans l'un des styles courants sur les serveurs français. */
    String generate() {
        String name = switch (random.nextInt(10)) {
            case 0, 1 -> pick(FIRST_NAMES) + digits();                                  // Lucas59, Theo2011
            case 2 -> lower(pick(FIRST_NAMES)) + "_" + digits();                        // lucas_59
            case 3 -> pick(PREFIXES) + pick(SUFFIXES);                                  // DarkHunter
            case 4 -> pick(PREFIXES) + "_" + pick(SUFFIXES) + (random.nextBoolean() ? digits() : "");
            case 5 -> pick(WORDS) + pick(TAGS);                                         // KrakenFR
            case 6 -> lower(pick(WORDS)) + "_" + lower(pick(WORDS));                    // patate_nuage
            case 7 -> pick(FIRST_NAMES) + pick(WORDS);                                  // TheoPanda
            case 8 -> random.nextInt(4) == 0 ? "xX" + pick(WORDS) + "Xx" : "The" + pick(WORDS) + digits();
            default -> pick(WORDS) + digits();                                          // Creeper77
        };
        if (repeats(name)) return generate(); // « StormStorm », « Wolf_Wolf » : personne ne s'appelle comme ça
        return name.length() > 16 ? name.substring(0, 16) : name;
    }

    /** Même mot répété (StormStorm, patate_patate, LoupLoup). */
    static boolean repeats(String name) {
        String n = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
        for (int len = 3; len * 2 <= n.length(); len++) {
            for (int i = 0; i + 2 * len <= n.length(); i++) {
                if (n.regionMatches(i, n, i + len, len)) return true;
            }
        }
        return false;
    }

    private String pick(String[] values) {
        return values[random.nextInt(values.length)];
    }

    /** Chiffres « réalistes » : département, année de naissance ou petit nombre. */
    private String digits() {
        return switch (random.nextInt(4)) {
            case 0 -> String.valueOf(random.nextInt(1, 96));                // 59, 13, 75…
            case 1 -> String.valueOf(2005 + random.nextInt(13));            // 2005-2017
            case 2 -> String.valueOf(random.nextInt(10));
            default -> String.format(Locale.ROOT, "%02d", random.nextInt(100));
        };
    }

    private static String lower(String s) {
        return s.toLowerCase(Locale.ROOT);
    }
}
