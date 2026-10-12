package fr.vaeloria.rtp.portal;

/** Lecture des couleurs de la config (« #D21F2F », « D21F2F » ou « 210,31,47 »). */
public final class Colors {
    private Colors() {}

    /** @return la couleur au format 0xRRGGBB */
    public static int parse(String raw) {
        if (raw == null) throw new IllegalArgumentException("Couleur manquante");
        String v = raw.trim();
        if (v.contains(",")) {
            String[] p = v.split(",");
            if (p.length != 3) throw new IllegalArgumentException("Couleur invalide : " + raw);
            int r = channel(p[0]), g = channel(p[1]), b = channel(p[2]);
            return (r << 16) | (g << 8) | b;
        }
        if (v.startsWith("#")) v = v.substring(1);
        if (!v.matches("[0-9A-Fa-f]{6}")) throw new IllegalArgumentException("Couleur invalide : " + raw);
        return Integer.parseInt(v, 16);
    }

    private static int channel(String s) {
        int c = Integer.parseInt(s.trim());
        if (c < 0 || c > 255) throw new IllegalArgumentException("Composante hors de 0-255 : " + c);
        return c;
    }
}
