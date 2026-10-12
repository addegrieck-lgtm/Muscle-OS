package fr.vaeloria.rtp.portal;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Portail : une zone dans un monde ; y entrer envoie le joueur vers une position fixe
 * ou en RTP dans un monde. Sans dépendance Bukkit (testable).
 */
public final class Portal {
    public enum Destination { NONE, LOCATION, RTP }

    private final String name;
    private String world;
    private Cuboid zone;
    private boolean enabled = true;
    private String style;
    private boolean permissionRequired = false;
    private Destination destination = Destination.NONE;
    private String destWorld;
    private double destX, destY, destZ;
    private float destYaw, destPitch;
    private String rtpWorld;

    public Portal(String name, String world, Cuboid zone, String style) {
        if (!isValidName(name)) throw new IllegalArgumentException("Nom de portail invalide (lettres, chiffres, - et _) : " + name);
        this.name = name.toLowerCase(Locale.ROOT);
        this.world = world;
        this.zone = zone;
        this.style = style;
    }

    public static boolean isValidName(String name) {
        return name != null && name.matches("[A-Za-z0-9_-]{1,32}");
    }

    public void sendTo(String world, double x, double y, double z, float yaw, float pitch) {
        destination = Destination.LOCATION;
        destWorld = world;
        destX = x;
        destY = y;
        destZ = z;
        destYaw = yaw;
        destPitch = pitch;
    }

    public void sendToRtp(String rtpWorld) {
        destination = Destination.RTP;
        this.rtpWorld = rtpWorld;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("world", world);
        m.put("zone", zone.serialize());
        m.put("enabled", enabled);
        m.put("style", style);
        m.put("permission", permissionRequired);
        m.put("destination", destination.name());
        if (destination == Destination.LOCATION) {
            m.put("dest-world", destWorld);
            m.put("dest-x", destX);
            m.put("dest-y", destY);
            m.put("dest-z", destZ);
            m.put("dest-yaw", (double) destYaw);
            m.put("dest-pitch", (double) destPitch);
        } else if (destination == Destination.RTP) {
            m.put("rtp-world", rtpWorld);
        }
        return m;
    }

    public static Portal fromMap(String name, Map<String, Object> m) {
        Portal p = new Portal(name, String.valueOf(m.get("world")), Cuboid.parse(String.valueOf(m.get("zone"))),
                String.valueOf(m.getOrDefault("style", "vaeloria")));
        p.enabled = Boolean.parseBoolean(String.valueOf(m.getOrDefault("enabled", true)));
        p.permissionRequired = Boolean.parseBoolean(String.valueOf(m.getOrDefault("permission", false)));
        String dest = String.valueOf(m.getOrDefault("destination", "NONE")).toUpperCase(Locale.ROOT);
        if (dest.equals("LOCATION") && m.get("dest-world") != null) {
            p.sendTo(String.valueOf(m.get("dest-world")), num(m, "dest-x"), num(m, "dest-y"), num(m, "dest-z"),
                    (float) num(m, "dest-yaw"), (float) num(m, "dest-pitch"));
        } else if (dest.equals("RTP") && m.get("rtp-world") != null) {
            p.sendToRtp(String.valueOf(m.get("rtp-world")));
        }
        return p;
    }

    private static double num(Map<String, Object> m, String key) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.doubleValue();
        try {
            return v == null ? 0 : Double.parseDouble(v.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    public String name() { return name; }
    public String world() { return world; }
    public Cuboid zone() { return zone; }
    public void zone(String world, Cuboid zone) { this.world = world; this.zone = zone; }
    public boolean enabled() { return enabled; }
    public void enabled(boolean v) { enabled = v; }
    public String style() { return style; }
    public void style(String v) { style = v; }
    public boolean permissionRequired() { return permissionRequired; }
    public void permissionRequired(boolean v) { permissionRequired = v; }
    public Destination destination() { return destination; }
    public String destWorld() { return destWorld; }
    public double destX() { return destX; }
    public double destY() { return destY; }
    public double destZ() { return destZ; }
    public float destYaw() { return destYaw; }
    public float destPitch() { return destPitch; }
    public String rtpWorld() { return rtpWorld; }

    public String permissionNode() {
        return "vaeloria.rtp.portal." + name;
    }

    /** Description courte de la destination, pour les menus et /rtpadmin portal list. */
    public String describeDestination() {
        return switch (destination) {
            case NONE -> "non définie";
            case LOCATION -> destWorld + " " + Math.round(destX) + " " + Math.round(destY) + " " + Math.round(destZ);
            case RTP -> "RTP dans " + rtpWorld;
        };
    }
}
