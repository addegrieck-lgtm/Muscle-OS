package fr.vaeloria.tab;

/**
 * Wordmark animé : lettres argent balayées par un reflet blanc, comme le métal du logo,
 * et la lettre d'accent (l'Æ) fixe en rubis. Produit une chaîne MiniMessage par image.
 * Sans dépendance à Bukkit : testable seul.
 */
public record Shine(String text, String accent, int accentColor, int baseColor, int shineColor,
                    int width, int pauseFrames, boolean bold) {

    public Shine {
        if (width < 1) width = 1;
        if (pauseFrames < 0) pauseFrames = 0;
    }

    /** Nombre d'images d'un cycle complet : passage du reflet de gauche à droite, puis pause. */
    public int cycle() {
        return text.length() + 2 * width + pauseFrames;
    }

    /** Intensité du reflet (0 à 1) sur le caractère {@code index} à l'image {@code frame}. */
    double intensity(int index, int frame) {
        int pos = Math.floorMod(frame, cycle()) - width;
        if (pos > text.length() + width) return 0; // pause entre deux passages
        double t = 1.0 - Math.abs(index - pos) / (double) width;
        return Math.max(0, t);
    }

    public String render(int frame) {
        StringBuilder out = new StringBuilder(text.length() * 12);
        if (bold) out.append("<bold>");
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (Character.isWhitespace(c)) {
                out.append(c);
                continue;
            }
            int color = accent.indexOf(c) >= 0 ? accentColor : lerp(baseColor, shineColor, intensity(i, frame));
            out.append("<").append(hex(color)).append(">");
            if (c == '<' || c == '\\') out.append('\\');
            out.append(c).append("</").append(hex(color)).append(">");
        }
        if (bold) out.append("</bold>");
        return out.toString();
    }

    static int lerp(int from, int to, double t) {
        int r = (int) Math.round(((from >> 16) & 0xFF) + (((to >> 16) & 0xFF) - ((from >> 16) & 0xFF)) * t);
        int g = (int) Math.round(((from >> 8) & 0xFF) + (((to >> 8) & 0xFF) - ((from >> 8) & 0xFF)) * t);
        int b = (int) Math.round((from & 0xFF) + ((to & 0xFF) - (from & 0xFF)) * t);
        return (r << 16) | (g << 8) | b;
    }

    static String hex(int rgb) {
        return String.format("#%06X", rgb & 0xFFFFFF);
    }

    /** "#A3121E" → 0xA3121E. */
    public static int parse(String hex) {
        String h = hex.startsWith("#") ? hex.substring(1) : hex;
        if (h.length() != 6) throw new IllegalArgumentException("Couleur invalide : " + hex);
        return Integer.parseInt(h, 16);
    }
}
