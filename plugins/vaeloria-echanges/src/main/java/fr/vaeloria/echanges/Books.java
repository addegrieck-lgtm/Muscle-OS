package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.BookOffer;

import java.util.Map;

/** Noms français des livres, pour les messages (les noms affichés en jeu restent ceux du client). */
public final class Books {
    private Books() {}

    private static final Map<String, String> NAMES = Map.ofEntries(
            Map.entry("protection", "Protection"), Map.entry("fire_protection", "Protection contre le feu"),
            Map.entry("blast_protection", "Protection contre les explosions"), Map.entry("projectile_protection", "Protection contre les projectiles"),
            Map.entry("feather_falling", "Chute amortie"), Map.entry("respiration", "Apnée"), Map.entry("aqua_affinity", "Affinité aquatique"),
            Map.entry("thorns", "Épines"), Map.entry("depth_strider", "Agilité aquatique"), Map.entry("frost_walker", "Semelles givrantes"),
            Map.entry("soul_speed", "Agilité des âmes"), Map.entry("swift_sneak", "Furtivité rapide"),
            Map.entry("sharpness", "Tranchant"), Map.entry("smite", "Châtiment"), Map.entry("bane_of_arthropods", "Fléau des arthropodes"),
            Map.entry("knockback", "Recul"), Map.entry("fire_aspect", "Aura de feu"), Map.entry("looting", "Butin"), Map.entry("sweeping_edge", "Affilage"),
            Map.entry("efficiency", "Efficacité"), Map.entry("silk_touch", "Toucher de soie"), Map.entry("unbreaking", "Solidité"), Map.entry("fortune", "Fortune"),
            Map.entry("power", "Puissance"), Map.entry("punch", "Frappe"), Map.entry("flame", "Flamme"), Map.entry("infinity", "Infinité"),
            Map.entry("luck_of_the_sea", "Chance de la mer"), Map.entry("lure", "Appât"), Map.entry("mending", "Raccommodage"),
            Map.entry("loyalty", "Loyauté"), Map.entry("impaling", "Empalement"), Map.entry("riptide", "Impulsion"), Map.entry("channeling", "Canalisation"),
            Map.entry("multishot", "Tir multiple"), Map.entry("quick_charge", "Charge rapide"), Map.entry("piercing", "Perforation"),
            Map.entry("density", "Densité"), Map.entry("breach", "Brèche"), Map.entry("wind_burst", "Rafale"));

    private static final String[] ROMAN = {"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"};

    public static String name(String enchant, int level) {
        String n = NAMES.getOrDefault(enchant, enchant);
        return level >= 1 && level < ROMAN.length ? n + " " + ROMAN[level] : n + " " + level;
    }

    public static String name(BookOffer o) { return name(o.enchant(), o.level()); }

    /** « protection:4 » → « Protection IV ». */
    public static String nameOfId(String id) {
        int i = id.lastIndexOf(':');
        if (i < 0) return id;
        try {
            return name(id.substring(0, i), Integer.parseInt(id.substring(i + 1)));
        } catch (NumberFormatException e) {
            return id;
        }
    }
}
