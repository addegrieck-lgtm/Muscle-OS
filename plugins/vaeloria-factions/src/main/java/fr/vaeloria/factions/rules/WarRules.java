package fr.vaeloria.factions.rules;

/** Règles pures des guerres officielles. */
public final class WarRules {
    private WarRules() {}

    public enum Winner { ATTACKER, DEFENDER, DRAW }

    public static Winner winner(int attackerScore, int defenderScore) {
        if (attackerScore > defenderScore) return Winner.ATTACKER;
        if (defenderScore > attackerScore) return Winner.DEFENDER;
        return Winner.DRAW;
    }

    /** Clé indépendante de l'ordre, pour le délai entre deux guerres des mêmes factions. */
    public static String pairKey(String a, String b) {
        return a.compareTo(b) < 0 ? a + "|" + b : b + "|" + a;
    }

    public enum Phase { PREPARATION, ACTIVE, OVER }

    public static Phase phase(long now, long startAt, long endAt) {
        if (now < startAt) return Phase.PREPARATION;
        if (now < endAt) return Phase.ACTIVE;
        return Phase.OVER;
    }
}
