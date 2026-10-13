package fr.vaeloria.fakeplayers.market;

import java.util.Locale;
import java.util.Random;

/** Prix « humains » : arrondis comme un joueur les tape, et écrits comme dans le chat (5,8k, 5k8, 5800). */
public final class Prices {
    private Prices() {}

    /** Arrondi à une valeur ronde selon l'ordre de grandeur (4 870 → 4 850, 23 140 → 23 000). */
    public static double human(double price) {
        double step;
        if (price < 100) step = 1;
        else if (price < 1_000) step = 10;
        else if (price < 10_000) step = 50;
        else if (price < 100_000) step = 500;
        else step = 5_000;
        return Math.max(1, Math.round(price / step) * step);
    }

    /** Prix écrit dans le chat, dans l'une des formes courantes. */
    public static String say(double price, Random random) {
        long p = Math.round(price);
        if (p < 1_000) return p + (random.nextInt(3) == 0 ? "$" : "");
        if (p >= 1_000_000) {
            String m = trim(p / 1_000_000.0);
            return random.nextBoolean() ? m.replace('.', ',') + "m" : m + "M";
        }
        double k = p / 1_000.0;
        String ks = trim(k);
        int style = random.nextInt(5);
        boolean round = k == Math.rint(k);
        return switch (style) {
            case 0 -> ks.replace('.', ',') + "k";
            case 1 -> ks + "k";
            case 2 -> round ? ks + "k" : (long) k + "k" + digitsAfter(k);
            case 3 -> String.format(Locale.ROOT, "%d", p);
            default -> round ? (long) k + "k" : ks.replace('.', ',') + "k";
        };
    }

    private static String digitsAfter(double k) {
        String s = trim(k);
        return s.substring(s.indexOf('.') + 1);
    }

    private static String trim(double v) {
        String s = String.format(Locale.ROOT, "%.2f", v);
        s = s.replaceAll("0+$", "");
        return s.endsWith(".") ? s.substring(0, s.length() - 1) : s;
    }
}
