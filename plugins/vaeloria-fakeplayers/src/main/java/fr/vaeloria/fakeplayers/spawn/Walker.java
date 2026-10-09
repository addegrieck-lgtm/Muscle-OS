package fr.vaeloria.fakeplayers.spawn;

/**
 * Déplacement pas à pas vers une cible sur le terrain réel : avance tout droit, contourne un obstacle en essayant
 * des directions de plus en plus écartées, ne s'approche jamais d'un trou (vérifie aussi le sol un peu plus loin).
 */
public final class Walker {
    /**
     * Nouvelle position et orientation (yaw Minecraft, en degrés). {@code side} : côté du contournement en cours
     * (+1 ou -1), à repasser au pas suivant pour longer l'obstacle au lieu d'hésiter entre gauche et droite.
     */
    public record Step(double x, double y, double z, float yaw, int side) {}

    private static final double[] DETOURS = {30, 60, 90, 125};
    private static final double LOOKAHEAD = 0.6;

    private Walker() {}

    /** Yaw Minecraft pour regarder dans la direction (dx, dz). */
    public static float yaw(double dx, double dz) {
        return (float) Math.toDegrees(Math.atan2(-dx, dz));
    }

    /**
     * Un pas de {@code speed} blocs vers (tx, tz).
     * @return la nouvelle position, ou null si tout est bloqué (choisir une autre cible)
     */
    public static Step step(Terrain terrain, double x, double y, double z, double tx, double tz, double speed) {
        return step(terrain, x, y, z, tx, tz, speed, 1);
    }

    /** Comme {@link #step(Terrain, double, double, double, double, double, double)}, en contournant d'abord par {@code side}. */
    public static Step step(Terrain terrain, double x, double y, double z, double tx, double tz, double speed, int side) {
        double dx = tx - x, dz = tz - z;
        double dist = Math.hypot(dx, dz);
        if (dist < 1e-6) return null;
        double move = Math.min(speed, dist);
        double base = Math.atan2(dz, dx);
        int s = side >= 0 ? 1 : -1;
        double[] order = new double[1 + DETOURS.length * 2];
        for (int i = 0; i < DETOURS.length; i++) {
            order[1 + i] = s * DETOURS[i];                    // d'abord le côté déjà choisi, de plus en plus écarté
            order[1 + DETOURS.length + i] = -s * DETOURS[i];  // puis l'autre côté
        }
        for (double detour : order) {
            double a = base + Math.toRadians(detour);
            double cx = Math.cos(a), cz = Math.sin(a);
            double nx = x + cx * move, nz = z + cz * move;
            double feet = terrain.feet(floor(nx), y, floor(nz));
            if (Double.isNaN(feet)) continue;
            // Sol encore présent un peu plus loin dans cette direction : on ne se colle pas au bord du vide.
            double ahead = terrain.feet(floor(nx + cx * LOOKAHEAD), feet, floor(nz + cz * LOOKAHEAD));
            if (Double.isNaN(ahead)) continue;
            return new Step(nx, feet, nz, yaw(cx, cz), detour == 0 ? s : (detour > 0 ? 1 : -1));
        }
        return null;
    }

    private static int floor(double v) {
        return (int) Math.floor(v);
    }
}
