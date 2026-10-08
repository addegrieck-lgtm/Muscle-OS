package fr.vaeloria.mines.model;

import java.text.Normalizer;
import java.util.Locale;

/** Identifiants de mine utilisés dans les commandes (/mine reset mine-obsidienne) et dans mines.yml. */
public final class MineIds {
    private MineIds() {}

    public static final int MAX_LENGTH = 32;

    /** « &5Mine d'Obsidienne » → « mine-d-obsidienne ». Chaîne vide si rien d'utilisable. */
    public static String slug(String name) {
        String plain = name.replaceAll("[&§][0-9a-fk-orA-FK-OR]", "");
        String ascii = Normalizer.normalize(plain, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String s = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_]+", "-").replaceAll("^[-_]+|[-_]+$", "");
        return s.length() > MAX_LENGTH ? s.substring(0, MAX_LENGTH).replaceAll("[-_]+$", "") : s;
    }

    public static boolean isValid(String id) {
        return id != null && !id.isEmpty() && id.length() <= MAX_LENGTH && id.matches("[a-z0-9_-]+");
    }
}
