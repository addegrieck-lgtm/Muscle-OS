package fr.vaeloria.staff.image;

import java.util.HashMap;
import java.util.Map;

/**
 * Conversion d'une image ARGB vers les couleurs des cartes Minecraft.
 * La palette des cartes ne compte qu'environ 240 couleurs : la diffusion d'erreur de Floyd-Steinberg
 * répartit l'écart sur les pixels voisins, ce qui donne des dégradés et des photos bien plus fidèles
 * qu'une simple recherche de la couleur la plus proche.
 */
public final class MapDither {
    private MapDither() {}

    /** Octet « transparent » des cartes : le mur derrière le cadre reste visible. */
    public static final byte TRANSPARENT = 0;

    /**
     * @param argb       pixels (ligne par ligne)
     * @param palette    couleurs RGB de la palette ; {@code palette[i]} correspond à l'octet {@code firstIndex + i}
     * @param firstIndex premier octet opaque de la palette (4 dans Minecraft : 0 à 3 sont transparents)
     * @param dither     diffusion d'erreur (photos) ou couleur la plus proche (logos, aplats)
     */
    public static byte[] convert(int[] argb, int width, int height, int[] palette, int firstIndex, boolean dither) {
        byte[] out = new byte[width * height];
        Map<Integer, Integer> cache = new HashMap<>();
        // Erreurs accumulées pour la ligne courante et la suivante (r, g, b entrelacés).
        float[] current = new float[(width + 2) * 3];
        float[] next = new float[(width + 2) * 3];
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int p = argb[y * width + x];
                if ((p >>> 24) < 128) {
                    out[y * width + x] = TRANSPARENT;
                    continue;
                }
                int e = (x + 1) * 3;
                int r = clamp(((p >> 16) & 0xFF) + (dither ? Math.round(current[e]) : 0));
                int g = clamp(((p >> 8) & 0xFF) + (dither ? Math.round(current[e + 1]) : 0));
                int b = clamp((p & 0xFF) + (dither ? Math.round(current[e + 2]) : 0));
                int rgb = (r << 16) | (g << 8) | b;
                int best = cache.computeIfAbsent(rgb, c -> nearest(c, palette));
                out[y * width + x] = (byte) (firstIndex + best);
                if (!dither) continue;
                int chosen = palette[best];
                float er = r - ((chosen >> 16) & 0xFF), eg = g - ((chosen >> 8) & 0xFF), eb = b - (chosen & 0xFF);
                spread(current, e + 3, er, eg, eb, 7 / 16f);
                spread(next, e - 3, er, eg, eb, 3 / 16f);
                spread(next, e, er, eg, eb, 5 / 16f);
                spread(next, e + 3, er, eg, eb, 1 / 16f);
            }
            float[] swap = current;
            current = next;
            next = swap;
            java.util.Arrays.fill(next, 0f);
        }
        return out;
    }

    private static void spread(float[] row, int i, float r, float g, float b, float w) {
        row[i] += r * w;
        row[i + 1] += g * w;
        row[i + 2] += b * w;
    }

    private static int clamp(int v) {
        return v < 0 ? 0 : Math.min(255, v);
    }

    /** Indice de la couleur la plus proche (distance « redmean », proche de la perception humaine). */
    static int nearest(int rgb, int[] palette) {
        int r = (rgb >> 16) & 0xFF, g = (rgb >> 8) & 0xFF, b = rgb & 0xFF;
        int best = 0;
        double bestDistance = Double.MAX_VALUE;
        for (int i = 0; i < palette.length; i++) {
            int c = palette[i];
            int pr = (c >> 16) & 0xFF, pg = (c >> 8) & 0xFF, pb = c & 0xFF;
            double mean = (r + pr) / 2.0;
            double dr = r - pr, dg = g - pg, db = b - pb;
            double d = (2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db;
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        }
        return best;
    }
}
