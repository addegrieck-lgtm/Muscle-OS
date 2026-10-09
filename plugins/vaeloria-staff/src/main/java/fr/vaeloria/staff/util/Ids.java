package fr.vaeloria.staff.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

/** Identifiants (annonces, pancartes, PNJ, images) : utilisés dans les commandes et les fichiers YAML. */
public final class Ids {
    private Ids() {}

    public static final int MAX_LENGTH = 32;

    /** « &6Bienvenue à l'Arène ! » → « bienvenue_a_l_arene ». Chaîne vide si rien d'utilisable. */
    public static String slug(String name) {
        String plain = name.replaceAll("[&§]#[0-9a-fA-F]{6}", "").replaceAll("[&§][0-9a-fk-orA-FK-OR]", "");
        String ascii = Normalizer.normalize(plain, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String s = ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        return s.length() > MAX_LENGTH ? s.substring(0, MAX_LENGTH).replaceAll("_+$", "") : s;
    }

    /** Identifiant libre dérivé du nom : « arene », « arene_2 », « arene_3 »… ({@code fallback} si le nom est vide). */
    public static String unique(String name, String fallback, Predicate<String> taken) {
        String base = slug(name);
        if (base.isEmpty()) base = fallback;
        String id = base;
        for (int i = 2; taken.test(id); i++) id = base + "_" + i;
        return id;
    }
}
