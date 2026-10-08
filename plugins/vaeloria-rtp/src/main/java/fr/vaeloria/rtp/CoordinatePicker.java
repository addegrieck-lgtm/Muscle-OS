package fr.vaeloria.rtp;

import java.util.random.RandomGenerator;

/**
 * Tire un point uniformément dans l'anneau [min, max] autour du centre.
 * CIRCLE : distance euclidienne ; SQUARE : distance de Tchebychev (carré creux).
 * Tirage direct (pas de rejet) : reste efficace même avec un anneau très fin.
 */
public final class CoordinatePicker {
    private CoordinatePicker() {}

    public static int[] pick(RtpWorld.Shape shape, int centerX, int centerZ, int minRadius, int maxRadius, RandomGenerator rng) {
        double min = Math.max(0, minRadius);
        double max = Math.max(min + 1, maxRadius);
        // Le périmètre croît linéairement avec le rayon : densité ∝ r, d'où la racine carrée.
        double r = Math.sqrt(rng.nextDouble() * (max * max - min * min) + min * min);
        double dx;
        double dz;
        if (shape == RtpWorld.Shape.CIRCLE) {
            double angle = rng.nextDouble() * Math.PI * 2;
            dx = Math.cos(angle) * r;
            dz = Math.sin(angle) * r;
        } else {
            // Position uniforme sur le contour du carré de demi-côté r.
            double t = rng.nextDouble() * 8 * r;
            int side = (int) Math.min(3, Math.floor(t / (2 * r)));
            double along = t - side * 2 * r - r; // dans [-r, r]
            switch (side) {
                case 0 -> { dx = along; dz = -r; }
                case 1 -> { dx = r; dz = along; }
                case 2 -> { dx = -along; dz = r; }
                default -> { dx = -r; dz = -along; }
            }
        }
        return new int[] {centerX + (int) Math.floor(dx), centerZ + (int) Math.floor(dz)};
    }
}
