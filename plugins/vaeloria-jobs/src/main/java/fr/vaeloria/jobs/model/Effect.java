package fr.vaeloria.jobs.model;

import java.util.Locale;
import java.util.Map;

/**
 * Bonus 100 % vanilla accordé par un nœud de l'arbre : un modificateur d'attribut Minecraft
 * (armor, armor_toughness, max_health…) ou un effet de potion permanent (fire_resistance…).
 * Aucun objet, drop ou mécanique inventés.
 *
 * @param key    identifiant Minecraft sans espace de noms : {@code armor}, {@code fire_resistance}
 * @param amount valeur du modificateur ; pour une potion, le niveau (1 = I, 2 = II)
 */
public record Effect(Kind kind, String key, double amount, Operation operation) {
    public enum Kind { ATTRIBUTE, POTION }

    /** Opérations vanilla des attributs (noms de la commande /attribute). */
    public enum Operation {
        ADD("add_value"), MULTIPLY_BASE("add_multiplied_base"), MULTIPLY_TOTAL("add_multiplied_total");

        public final String vanillaName;

        Operation(String vanillaName) { this.vanillaName = vanillaName; }

        public static Operation parse(String s) {
            if (s == null || s.isBlank()) return ADD;
            String v = s.trim().toLowerCase(Locale.ROOT);
            for (Operation o : values()) {
                if (o.vanillaName.equals(v) || o.name().toLowerCase(Locale.ROOT).equals(v)) return o;
            }
            return switch (v) {
                case "add", "add_number" -> ADD;
                case "multiply", "multiply_base", "add_scalar" -> MULTIPLY_BASE;
                case "multiply_scalar_1" -> MULTIPLY_TOTAL;
                default -> throw new IllegalArgumentException("opération inconnue : " + s);
            };
        }
    }

    public Effect {
        if (kind == null || key == null || key.isBlank()) throw new IllegalArgumentException("effet incomplet");
        key = key.trim().toLowerCase(Locale.ROOT);
        if (key.startsWith("minecraft:")) key = key.substring("minecraft:".length());
        if (key.startsWith("generic.") || key.startsWith("player.")) key = key.substring(key.indexOf('.') + 1);
        if (operation == null) operation = Operation.ADD;
        if (kind == Kind.POTION && (amount < 1 || amount > 10 || amount != Math.floor(amount))) {
            throw new IllegalArgumentException("niveau de potion entre 1 et 10 : " + key);
        }
    }

    public static Effect attribute(String key, double amount, Operation op) {
        return new Effect(Kind.ATTRIBUTE, key, amount, op);
    }

    public static Effect potion(String key, int level) {
        return new Effect(Kind.POTION, key, level, Operation.ADD);
    }

    /** Amplificateur Bukkit d'une potion (niveau I = 0). */
    public int amplifier() {
        return (int) amount - 1;
    }

    private static final Map<String, String> ATTRIBUTE_LABELS = Map.ofEntries(
            Map.entry("armor", "Armure"),
            Map.entry("armor_toughness", "Robustesse d'armure"),
            Map.entry("max_health", "Vie maximale"),
            Map.entry("knockback_resistance", "Résistance au recul"),
            Map.entry("explosion_knockback_resistance", "Résistance au souffle des explosions"),
            Map.entry("burning_time", "Durée de combustion"),
            Map.entry("fall_damage_multiplier", "Dégâts de chute"),
            Map.entry("safe_fall_distance", "Chute sans dégâts"),
            Map.entry("oxygen_bonus", "Apnée"),
            Map.entry("movement_speed", "Vitesse"),
            Map.entry("water_movement_efficiency", "Nage"),
            Map.entry("movement_efficiency", "Déplacement en terrain difficile"),
            Map.entry("mining_efficiency", "Efficacité de minage"),
            Map.entry("block_break_speed", "Vitesse de minage"),
            Map.entry("luck", "Chance"));

    private static final Map<String, String> POTION_LABELS = Map.ofEntries(
            Map.entry("fire_resistance", "Résistance au feu"),
            Map.entry("water_breathing", "Respiration aquatique"),
            Map.entry("night_vision", "Vision nocturne"),
            Map.entry("resistance", "Résistance"),
            Map.entry("regeneration", "Régénération"),
            Map.entry("haste", "Célérité"),
            Map.entry("speed", "Vitesse"),
            Map.entry("saturation", "Saturation"),
            Map.entry("absorption", "Absorption"),
            Map.entry("health_boost", "Bonus de vie"),
            Map.entry("slow_falling", "Chute lente"),
            Map.entry("dolphins_grace", "Grâce du dauphin"),
            Map.entry("conduit_power", "Force de conduit"));

    private static final String[] ROMAN = {"I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"};

    /** « +1 Armure », « -25 % Durée de combustion », « +1 cœur Vie maximale », « Résistance au feu I (permanent) ». */
    public String describe() {
        if (kind == Kind.POTION) {
            return POTION_LABELS.getOrDefault(key, key) + " " + ROMAN[(int) amount - 1] + " (permanent)";
        }
        String label = ATTRIBUTE_LABELS.getOrDefault(key, key);
        String sign = amount >= 0 ? "+" : "-";
        double abs = Math.abs(amount);
        if (operation != Operation.ADD) return sign + number(abs * 100) + " % " + label;
        if (key.equals("max_health")) {
            double hearts = abs / 2;
            return sign + number(hearts) + (hearts > 1 ? " cœurs" : " cœur") + " de vie maximale";
        }
        if (key.equals("safe_fall_distance")) return sign + number(abs) + (abs > 1 ? " blocs" : " bloc") + " de chute sans dégâts";
        if (key.endsWith("resistance")) return sign + number(abs * 100) + " % " + label;
        return sign + number(abs) + " " + label;
    }

    private static String number(double v) {
        if (v == Math.rint(v)) return Long.toString((long) v);
        return String.format(Locale.FRANCE, "%.2f", v).replaceAll("0+$", "").replaceAll(",$", "");
    }
}
