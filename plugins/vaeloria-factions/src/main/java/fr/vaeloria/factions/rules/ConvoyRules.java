package fr.vaeloria.factions.rules;

/** Victoire du convoi : à l'avant-poste de sa faction, ou hors de la warzone pour qui n'en a pas. */
public final class ConvoyRules {
    private ConvoyRules() {}

    public enum Goal { REACH_OUTPOST, LEAVE_WARZONE }

    public static Goal goal(int outpostsHeld) {
        return outpostsHeld > 0 ? Goal.REACH_OUTPOST : Goal.LEAVE_WARZONE;
    }

    public static boolean won(int outpostsHeld, boolean insideOwnOutpost, boolean insideWarzone) {
        return goal(outpostsHeld) == Goal.REACH_OUTPOST ? insideOwnOutpost : !insideWarzone;
    }
}
