package fr.vaeloria.factions.rules;

/** Calculs de power, purs et testables. Le power d'une faction borne le nombre de chunks qu'elle peut tenir. */
public final class PowerMath {
    private PowerMath() {}

    public static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    /** Nombre de claims autorisés pour un power donné. */
    public static int landLimit(double power, double claimsPerPower, int hardMax) {
        int byPower = (int) Math.floor(Math.max(0, power) * claimsPerPower + 1e-9);
        return hardMax > 0 ? Math.min(byPower, hardMax) : byPower;
    }

    /**
     * Une faction est surclaimable quand elle tient plus de territoire que son power ne le permet :
     * c'est la règle historique des serveurs Faction.
     */
    public static boolean isVulnerable(int claims, double power, double claimsPerPower) {
        return claims > landLimit(power, claimsPerPower, 0);
    }

    public static double round(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
