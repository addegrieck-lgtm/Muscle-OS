package fr.vaeloria.villageois.model;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Un livre que les bibliothécaires peuvent proposer.
 *
 * @param id       clé dans la config, « enchantement-niveau » (ex. « protection-4 », « mending »)
 * @param enchant  enchantement Minecraft (ex. « protection »)
 * @param price    prix en émeraudes, réductions ignorées (soin de zombie, Héros du village)
 * @param maxUses  achats possibles avant le réapprovisionnement du villageois
 * @param weight   poids du livre à l'intérieur de son palier
 * @param tier     palier (courant, intermédiaire, rare…)
 * @param announce annonce à tout le serveur quand un boost fait apparaître ce livre
 */
public record BookOffer(String id, String enchant, int level, int price, int maxUses,
                        int weight, String tier, boolean announce) {
    private static final Pattern KEY = Pattern.compile("([a-z0-9_.:]+?)(?:-(\\d+))?");

    public BookOffer {
        if (level < 1) throw new IllegalArgumentException(id + " : niveau < 1");
        if (price < 1) throw new IllegalArgumentException(id + " : prix < 1");
        if (maxUses < 1) throw new IllegalArgumentException(id + " : max-uses < 1");
        if (weight < 0) throw new IllegalArgumentException(id + " : poids négatif");
    }

    /** Enchantement et niveau lus dans une clé de config. */
    public record Key(String enchant, int level) {
        public static Key parse(String id) {
            Matcher m = KEY.matcher(id.trim().toLowerCase(Locale.ROOT));
            if (!m.matches()) throw new IllegalArgumentException("clé de livre invalide « " + id + " » (attendu : enchantement-niveau)");
            return new Key(m.group(1), m.group(2) == null ? 1 : Integer.parseInt(m.group(2)));
        }
    }
}
