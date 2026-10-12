package fr.vaeloria.rtp.portal;

/** Zone rectangulaire de blocs, bornes incluses. */
public record Cuboid(int minX, int minY, int minZ, int maxX, int maxY, int maxZ) {
    public Cuboid {
        if (minX > maxX || minY > maxY || minZ > maxZ) throw new IllegalArgumentException("Bornes inversées");
    }

    /** Zone couvrant deux coins quelconques (ordre indifférent). */
    public static Cuboid of(int x1, int y1, int z1, int x2, int y2, int z2) {
        return new Cuboid(Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2),
                Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2));
    }

    public boolean contains(int x, int y, int z) {
        return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    }

    public long volume() {
        return (long) (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
    }

    public double centerX() { return (minX + maxX + 1) / 2.0; }
    public double centerY() { return (minY + maxY + 1) / 2.0; }
    public double centerZ() { return (minZ + maxZ + 1) / 2.0; }

    public String describe() {
        return (maxX - minX + 1) + "×" + (maxY - minY + 1) + "×" + (maxZ - minZ + 1);
    }

    public String serialize() {
        return minX + "," + minY + "," + minZ + "," + maxX + "," + maxY + "," + maxZ;
    }

    public static Cuboid parse(String raw) {
        String[] parts = raw.split(",");
        if (parts.length != 6) throw new IllegalArgumentException("Zone invalide : " + raw);
        int[] v = new int[6];
        for (int i = 0; i < 6; i++) v[i] = Integer.parseInt(parts[i].trim());
        return of(v[0], v[1], v[2], v[3], v[4], v[5]);
    }
}
