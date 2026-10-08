package fr.vaeloria.arena;

import java.util.ArrayList;
import java.util.List;

/** Calculs de placement purs (sans Bukkit), relatifs au centre de l'arène. */
public final class ArenaGeometry {
    private ArenaGeometry() {}

    /**
     * Positions d'apparition {dx, dz} d'une équipe : une ligne perpendiculaire à l'axe X,
     * à {@code separation / 2} blocs du centre, côté négatif pour ROUGE et positif pour BLEU.
     */
    public static List<double[]> spawnOffsets(Team team, int size, double separation, double spacing) {
        double x = (team == Team.ROUGE ? -1 : 1) * separation / 2.0;
        List<double[]> out = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            double z = (i - (size - 1) / 2.0) * spacing;
            out.add(new double[] {x, z});
        }
        return out;
    }

    public static boolean isInside(double dx, double dz, double radius) {
        return dx * dx + dz * dz <= radius * radius;
    }
}
