package fr.vaeloria.fakeplayers;

import java.util.Locale;
import java.util.Random;

/**
 * Ping réaliste dans le TAB. Chaque faux joueur a sa connexion (toujours la même pour un même pseudo) :
 * 70 % bonne (5 barres), 20 % moyenne, 8 % faible, 2 % mauvaise. Le ping fluctue autour de cette base, avec de
 * petits pics de lag de quelques secondes. Repères Minecraft : 5 barres &lt; 150 ms, 4 &lt; 300, 3 &lt; 600, 2 &lt; 1000.
 */
public final class PingModel {
    private PingModel() {}

    /** Ping habituel d'un pseudo. */
    public static int base(String name) {
        Random r = new Random(name.toLowerCase(Locale.ROOT).hashCode() * 7919L + 3);
        double roll = r.nextDouble();
        if (roll < 0.70) return 15 + r.nextInt(55);    // fibre / bonne box
        if (roll < 0.90) return 70 + r.nextInt(70);    // wifi, 4G
        if (roll < 0.98) return 140 + r.nextInt(120);  // connexion faible : 4 barres
        return 260 + r.nextInt(190);                   // mauvaise connexion, loin
    }

    /**
     * Prochaine valeur (toutes les 5 s) : fluctuation de ±20 % autour de la base, et 3 % de chances d'un pic de lag
     * (×3 à ×8, plafonné à 1200 ms) qui dure 1 à 3 mesures.
     * @param spikeLeft mesures restantes du pic en cours (0 = pas de pic)
     * @return {ping, nouveau spikeLeft}
     */
    public static int[] next(int base, int spikeLeft, Random random) {
        if (spikeLeft > 0) {
            int spike = (int) Math.min(1200, base * (3 + random.nextDouble() * 5) + 80);
            return new int[]{spike, spikeLeft - 1};
        }
        if (random.nextDouble() < 0.03) return next(base, 1 + random.nextInt(3), random);
        double jitter = 1 + (random.nextDouble() - 0.5) * 0.4;
        return new int[]{Math.max(3, (int) Math.round(base * jitter)), 0};
    }
}
