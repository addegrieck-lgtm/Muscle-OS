package fr.vaeloria.factions.rules;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/** Tirage des missions du jour : identique pour tout le serveur, déterminé par la date. */
public final class MissionRules {
    private MissionRules() {}

    public static List<String> pick(List<String> pool, int count, String day) {
        List<String> l = new ArrayList<>(pool);
        Collections.shuffle(l, new Random(day.hashCode() * 31L + 7));
        return new ArrayList<>(l.subList(0, Math.min(count, l.size())));
    }

    /** Barre de progression texte : ▰▰▰▱▱▱▱▱▱▱ */
    public static String bar(int value, int target, int width) {
        int filled = target <= 0 ? width : (int) Math.round(Math.min(1.0, value / (double) target) * width);
        return "▰".repeat(filled) + "▱".repeat(Math.max(0, width - filled));
    }
}
