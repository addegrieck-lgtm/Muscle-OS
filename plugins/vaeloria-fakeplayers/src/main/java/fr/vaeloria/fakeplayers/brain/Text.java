package fr.vaeloria.fakeplayers.brain;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Outils de texte communs. */
public final class Text {
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9?]+");

    private Text() {}

    /** Minuscules, sans accents ni ponctuation (sauf « ? ») : « Ça va ?! » → « ca va ? ». */
    public static String normalize(String text) {
        return NON_WORD.matcher(stripAccents(text.toLowerCase(Locale.ROOT)).replace("?", " ? ")).replaceAll(" ").trim();
    }

    public static String stripAccents(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }

    /** Le texte normalisé contient-il ce mot ou cette expression (mots entiers) ? */
    public static boolean containsWords(String normalized, String phrase) {
        String p = normalize(phrase);
        return !p.isEmpty() && (" " + normalized + " ").contains(" " + p + " ");
    }
}
