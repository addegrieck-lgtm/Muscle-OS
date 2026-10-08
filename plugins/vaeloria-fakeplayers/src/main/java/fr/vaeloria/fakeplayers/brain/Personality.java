package fr.vaeloria.fakeplayers.brain;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * Façon d'écrire d'un faux joueur, déduite de son pseudo (toujours la même pour un même pseudo) :
 * abréviations, accents, majuscules, fautes de frappe, rire habituel, bavardage et sujets favoris.
 */
public record Personality(double chattiness, double abbreviations, boolean keepsAccents, boolean capitalizes,
                          double typos, String laugh, double laughRate, Set<String> favoriteTopics) {

    private static final String[] LAUGHS = {"mdr", "mdr", "ptdr", "xD", "lol", "mdrr", "ahah", "jpp", "", ""};
    private static final String[] TOPICS = {"pvp", "faction", "trade", "farm", "server", "fun", "build"};

    /** Expressions familières : utilisées selon le goût du joueur pour les abréviations. */
    private static final Map<String, String> SHORT = Map.ofEntries(
            Map.entry("je suis", "jsuis"), Map.entry("je sais pas", "jsp"), Map.entry("je ne sais pas", "jsp"),
            Map.entry("quelqu'un", "qqn"), Map.entry("quelque chose", "qqch"), Map.entry("pourquoi", "pk"),
            Map.entry("beaucoup", "bcp"), Map.entry("s'il te plait", "stp"), Map.entry("s'il te plaît", "stp"),
            Map.entry("c'est", "c"), Map.entry("tu es", "t"), Map.entry("t'es", "t"), Map.entry("d'accord", "dac"),
            Map.entry("je vais", "jvais"), Map.entry("je peux", "jpeux"), Map.entry("j'ai", "jai"),
            Map.entry("tout le monde", "tlm"), Map.entry("en vrai", "evr"), Map.entry("je crois", "jcrois"),
            Map.entry("vraiment", "vrmt"), Map.entry("toujours", "tjrs"), Map.entry("aujourd'hui", "ajd"),
            Map.entry("maintenant", "mtn"), Map.entry("salut", "slt"), Map.entry("bonjour", "bjr"),
            Map.entry("pas de souci", "pas de soucis"), Map.entry("cependant", "mais"), Map.entry("ouais", "ouai"));

    public static Personality of(String name) {
        Random r = new Random(name.toLowerCase(Locale.ROOT).hashCode() * 31L + 7);
        String first = TOPICS[r.nextInt(TOPICS.length)];
        String second = TOPICS[r.nextInt(TOPICS.length)];
        return new Personality(
                0.25 + r.nextDouble() * 1.75,          // certains parlent 7× plus que d'autres
                0.2 + r.nextDouble() * 0.75,
                r.nextDouble() < 0.35,
                r.nextDouble() < 0.12,
                r.nextDouble() < 0.4 ? 0 : r.nextDouble() * 0.05,
                LAUGHS[r.nextInt(LAUGHS.length)],
                r.nextDouble() * 0.2,
                Set.copyOf(java.util.List.of(first, second))); // first peut être égal à second
    }

    /** Réécrit une phrase dans le style du joueur. */
    public String style(String text, Random random) {
        String s = text;
        if (random.nextDouble() < abbreviations) {
            for (Map.Entry<String, String> e : SHORT.entrySet()) {
                if (random.nextDouble() < abbreviations) s = replaceWord(s, e.getKey(), e.getValue());
            }
        }
        if (!keepsAccents) s = Text.stripAccents(s);
        // Majuscule seulement sur une vraie phrase : personne n'écrit « Ggg » ou « Jpp ».
        if (capitalizes && s.split(" ").length >= 3) s = Character.toUpperCase(s.charAt(0)) + s.substring(1);
        if (typos > 0) s = typo(s, random);
        if (!laugh.isEmpty() && random.nextDouble() < laughRate && !laughs(s)) s = s + " " + laugh;
        return s;
    }

    private static boolean laughs(String s) {
        String n = Text.normalize(s);
        for (String l : LAUGHS) if (!l.isEmpty() && Text.containsWords(n, l)) return true;
        return Text.containsWords(n, "jpp") || Text.containsWords(n, "xd") || Text.containsWords(n, "lol");
    }

    private static String replaceWord(String s, String from, String to) {
        String lower = s.toLowerCase(Locale.ROOT);
        int i = lower.indexOf(from);
        while (i >= 0) {
            boolean startOk = i == 0 || !Character.isLetter(lower.charAt(i - 1));
            int end = i + from.length();
            boolean endOk = end >= lower.length() || !Character.isLetter(lower.charAt(end));
            if (startOk && endOk) {
                s = s.substring(0, i) + to + s.substring(end);
                lower = s.toLowerCase(Locale.ROOT);
                i = lower.indexOf(from, i + to.length());
            } else {
                i = lower.indexOf(from, i + 1);
            }
        }
        return s;
    }

    /** Une faute de frappe de temps en temps : deux lettres inversées ou une lettre doublée. */
    private String typo(String s, Random random) {
        if (s.length() < 6 || random.nextDouble() >= typos * 6) return s;
        int i = 1 + random.nextInt(s.length() - 2);
        if (!Character.isLetter(s.charAt(i)) || !Character.isLetter(s.charAt(i + 1))) return s;
        return random.nextBoolean()
                ? s.substring(0, i) + s.charAt(i + 1) + s.charAt(i) + s.substring(i + 2)
                : s.substring(0, i) + s.charAt(i) + s.substring(i);
    }

    public static List<String> topics() { return List.of(TOPICS); }
}
