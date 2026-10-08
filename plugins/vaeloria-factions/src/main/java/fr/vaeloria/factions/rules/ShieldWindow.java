package fr.vaeloria.factions.rules;

/** Bouclier quotidien : plage horaire pendant laquelle le territoire ne peut être ni explosé ni surclaim. */
public final class ShieldWindow {
    private ShieldWindow() {}

    /**
     * @param start  heure de début 0-23, négative si aucun bouclier
     * @param hours  durée en heures (1-23)
     * @param minuteOfDay minute courante 0-1439
     */
    public static boolean isActive(int start, int hours, int minuteOfDay) {
        if (start < 0 || hours <= 0) return false;
        int from = (start % 24) * 60;
        int to = from + Math.min(hours, 23) * 60;
        int m = Math.floorMod(minuteOfDay, 1440);
        if (to <= 1440) return m >= from && m < to;
        return m >= from || m < to - 1440;
    }

    public static String describe(int start, int hours) {
        if (start < 0) return "aucun";
        int end = (start + hours) % 24;
        return String.format("%02dh → %02dh", start, end);
    }
}
