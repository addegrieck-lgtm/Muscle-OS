package fr.vaeloria.mines.model;

/** Position précise (téléportation, hologramme), sérialisée « monde;x;y;z;yaw;pitch ». */
public record Spot(String world, double x, double y, double z, float yaw, float pitch) {
    public String serialize() {
        return world + ";" + x + ";" + y + ";" + z + ";" + yaw + ";" + pitch;
    }

    public static Spot parse(String s) {
        String[] p = s.split(";");
        if (p.length != 6 || p[0].isEmpty()) throw new IllegalArgumentException("Position invalide : " + s);
        return new Spot(p[0], Double.parseDouble(p[1]), Double.parseDouble(p[2]), Double.parseDouble(p[3]),
                Float.parseFloat(p[4]), Float.parseFloat(p[5]));
    }
}
