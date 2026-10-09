package fr.vaeloria.factions.rules;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Règles pures de la Forteresse (testées sans serveur). */
public final class FortressRules {
    private FortressRules() {}

    /** Répartit les factions inscrites dans les camps, à tour de rôle : faction → indice de camp. */
    public static Map<String, Integer> assignCamps(List<String> factions, int camps) {
        Map<String, Integer> m = new HashMap<>();
        if (camps <= 0) return m;
        for (int i = 0; i < factions.size(); i++) m.put(factions.get(i), i % camps);
        return m;
    }

    /** Joueurs en vie par faction (participant → faction). */
    public static Map<String, Integer> aliveByFaction(Collection<String> factionOfEachAlive) {
        Map<String, Integer> m = new HashMap<>();
        for (String f : factionOfEachAlive) m.merge(f, 1, Integer::sum);
        return m;
    }

    /** Factions retenues : celles qui ont au moins min inscrits ; max > 0 plafonne (les premiers inscrits restent). */
    public static List<String> eligible(Map<String, Integer> registered, int min) {
        List<String> l = new ArrayList<>();
        for (var e : registered.entrySet()) if (e.getValue() >= Math.max(1, min)) l.add(e.getKey());
        l.sort(String::compareTo);
        return l;
    }

    public static boolean canRegister(int alreadyFromFaction, int max) {
        return max <= 0 || alreadyFromFaction < max;
    }

    public enum Outcome { CONTINUE, WINNER, NOBODY }

    /** Plus qu'une faction en vie : elle gagne ; plus personne : pas de vainqueur. */
    public static Outcome check(Map<String, Integer> alive) {
        long teams = alive.values().stream().filter(v -> v > 0).count();
        if (teams == 0) return Outcome.NOBODY;
        return teams == 1 ? Outcome.WINNER : Outcome.CONTINUE;
    }

    /** Seule faction encore en vie, ou null. */
    public static String lastStanding(Map<String, Integer> alive) {
        String w = null;
        for (var e : alive.entrySet()) {
            if (e.getValue() <= 0) continue;
            if (w != null) return null;
            w = e.getKey();
        }
        return w;
    }

    /** Fin du temps : la faction la plus nombreuse au sommet gagne ; égalité ou sommet vide = pas de vainqueur. */
    public static String summitLeader(Map<String, Integer> onSummit) {
        String best = null;
        int max = 0;
        boolean tie = false;
        for (var e : onSummit.entrySet()) {
            if (e.getValue() > max) { max = e.getValue(); best = e.getKey(); tie = false; }
            else if (e.getValue() == max && max > 0) tie = true;
        }
        return tie ? null : best;
    }

    /** Après la fermeture, combien de temps reste-t-il pour atteindre le sommet (ms, 0 = délai écoulé). */
    public static long graceLeft(long closedAt, long graceMs, long now) {
        return Math.max(0, closedAt + graceMs - now);
    }
}
