package fr.vaeloria.crates.model;

import java.text.Normalizer;
import java.util.Locale;

/** Identifiants de coffre : utilisés dans les commandes (/crate give joueur <id>) et dans crates.yml. */
public final class CrateIds {
    private CrateIds() {}

    public static final int MAX_LENGTH = 32;

    /** « &6Coffre Légendaire ! » → « coffre_legendaire ». Chaîne vide si rien d'utilisable. */
    public static String slug(String name) {
        String plain = name.replaceAll("[&§][0-9a-fk-orA-FK-OR]", "");
        String ascii = Normalizer.normalize(plain, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String s = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        return s.length() > MAX_LENGTH ? s.substring(0, MAX_LENGTH).replaceAll("_+$", "") : s;
    }

    public static boolean isValid(String id) {
        return id != null && id.length() <= MAX_LENGTH && id.matches("[a-z0-9_]+");
    }
}
