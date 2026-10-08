package fr.vaeloria.crates.model;

/** Position d'un bloc-coffre, sérialisée « monde;x;y;z ». */
public record BlockPos(String world, int x, int y, int z) {
    public String serialize() {
        return world + ";" + x + ";" + y + ";" + z;
    }

    public static BlockPos parse(String s) {
        String[] p = s.split(";");
        if (p.length != 4 || p[0].isEmpty()) throw new IllegalArgumentException("Position invalide : " + s);
        return new BlockPos(p[0], Integer.parseInt(p[1]), Integer.parseInt(p[2]), Integer.parseInt(p[3]));
    }

    @Override
    public String toString() {
        return world + " " + x + " " + y + " " + z;
    }
}
