package fr.vaeloria.rtp;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Réglages RTP d'un monde. Classe sans dépendance Bukkit : testable et partagée par
 * les commandes admin et l'interface graphique (via {@link #set(String, String)}).
 */
public final class RtpWorld {
    public enum Shape { SQUARE, CIRCLE }

    /** Clés modifiables par /rtpadmin set et par les invites de l'interface admin. */
    public static final List<String> KEYS = List.of(
            "enabled", "display-name", "icon", "description", "slot", "shape", "center-x", "center-z",
            "min-radius", "max-radius", "cooldown", "warmup", "permission", "max-y");

    public static final int MAX_RADIUS_LIMIT = 30_000_000;

    private final String worldName;
    private boolean enabled = true;
    private String displayName;
    private String icon = "GRASS_BLOCK";
    private List<String> description = new ArrayList<>();
    private int slot = -1;
    private Shape shape = Shape.SQUARE;
    private int centerX = 0;
    private int centerZ = 0;
    private int minRadius = 300;
    private int maxRadius = 5000;
    private int cooldownSeconds = 300;
    private int warmupSeconds = 3;
    private boolean permissionRequired = false;
    /** Hauteur maximale de recherche ; null = automatique (surface, ou 120 pour un monde à plafond). */
    private Integer maxY = null;

    public RtpWorld(String worldName) {
        if (worldName == null || worldName.isBlank()) throw new IllegalArgumentException("Nom de monde vide");
        this.worldName = worldName;
        this.displayName = "<white>" + worldName;
    }

    public static RtpWorld fromMap(String worldName, Map<String, Object> map) {
        RtpWorld w = new RtpWorld(worldName);
        if (map == null) return w;
        for (String key : KEYS) {
            Object v = map.get(key);
            if (v == null) continue;
            if (key.equals("description") && v instanceof List<?> list) {
                w.description = new ArrayList<>(list.stream().map(String::valueOf).toList());
                continue;
            }
            try {
                w.set(key, String.valueOf(v));
            } catch (IllegalArgumentException ignored) {
                // Valeur invalide dans le fichier : on garde la valeur par défaut.
            }
        }
        return w;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("enabled", enabled);
        m.put("display-name", displayName);
        m.put("icon", icon);
        m.put("description", new ArrayList<>(description));
        m.put("slot", slot);
        m.put("shape", shape.name());
        m.put("center-x", centerX);
        m.put("center-z", centerZ);
        m.put("min-radius", minRadius);
        m.put("max-radius", maxRadius);
        m.put("cooldown", cooldownSeconds);
        m.put("warmup", warmupSeconds);
        m.put("permission", permissionRequired);
        m.put("max-y", maxY == null ? "auto" : maxY);
        return m;
    }

    /**
     * Modifie un réglage à partir d'un texte saisi par un admin.
     * @throws IllegalArgumentException avec un message lisible si la clé ou la valeur est invalide.
     */
    public void set(String key, String raw) {
        String value = raw == null ? "" : raw.trim();
        switch (key.toLowerCase(Locale.ROOT)) {
            case "enabled" -> enabled = parseBool(value);
            case "display-name" -> {
                if (value.isEmpty()) throw new IllegalArgumentException("Le nom affiché ne peut pas être vide");
                displayName = value;
            }
            case "icon" -> {
                if (!value.matches("[A-Za-z0-9_]+")) throw new IllegalArgumentException("Matériau invalide : " + value);
                icon = value.toUpperCase(Locale.ROOT);
            }
            case "description" -> description = value.isEmpty()
                    ? new ArrayList<>()
                    : new ArrayList<>(Arrays.stream(value.split("\\|")).map(String::trim).toList());
            case "slot" -> slot = Math.max(-1, Math.min(53, parseInt(value)));
            case "shape" -> {
                try {
                    shape = Shape.valueOf(value.toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Forme invalide (SQUARE ou CIRCLE) : " + value);
                }
            }
            case "center-x" -> centerX = clampCoord(parseInt(value));
            case "center-z" -> centerZ = clampCoord(parseInt(value));
            case "min-radius" -> setMinRadius(parseInt(value));
            case "max-radius" -> setMaxRadius(parseInt(value));
            case "cooldown" -> cooldownSeconds = Math.max(0, parseInt(value));
            case "warmup" -> warmupSeconds = Math.max(0, Math.min(60, parseInt(value)));
            case "permission" -> permissionRequired = parseBool(value);
            case "max-y" -> maxY = value.equalsIgnoreCase("auto") || value.isEmpty() ? null : parseInt(value);
            default -> throw new IllegalArgumentException("Réglage inconnu : " + key + " (" + String.join(", ", KEYS) + ")");
        }
    }

    /** Le rayon min ne peut pas dépasser le max : le max est repoussé si besoin. */
    public void setMinRadius(int value) {
        minRadius = Math.max(0, Math.min(MAX_RADIUS_LIMIT - 1, value));
        if (maxRadius <= minRadius) maxRadius = minRadius + 1;
    }

    /** Le rayon max ne peut pas descendre sous le min : le min est abaissé si besoin. */
    public void setMaxRadius(int value) {
        maxRadius = Math.max(1, Math.min(MAX_RADIUS_LIMIT, value));
        if (minRadius >= maxRadius) minRadius = maxRadius - 1;
    }

    private static int clampCoord(int v) {
        return Math.max(-MAX_RADIUS_LIMIT, Math.min(MAX_RADIUS_LIMIT, v));
    }

    private static int parseInt(String v) {
        try {
            return Integer.parseInt(v.replace("_", "").replace(" ", ""));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Nombre entier attendu : " + v);
        }
    }

    private static boolean parseBool(String v) {
        return switch (v.toLowerCase(Locale.ROOT)) {
            case "true", "oui", "on", "yes", "1" -> true;
            case "false", "non", "off", "no", "0" -> false;
            default -> throw new IllegalArgumentException("Valeur attendue : true/false (ou oui/non) : " + v);
        };
    }

    public String worldName() { return worldName; }
    public boolean enabled() { return enabled; }
    public void enabled(boolean v) { enabled = v; }
    public String displayName() { return displayName; }
    public String icon() { return icon; }
    public List<String> description() { return List.copyOf(description); }
    public int slot() { return slot; }
    public Shape shape() { return shape; }
    public void shape(Shape v) { shape = v; }
    public int centerX() { return centerX; }
    public int centerZ() { return centerZ; }
    public void center(int x, int z) { centerX = clampCoord(x); centerZ = clampCoord(z); }
    public int minRadius() { return minRadius; }
    public int maxRadius() { return maxRadius; }
    public int cooldownSeconds() { return cooldownSeconds; }
    public int warmupSeconds() { return warmupSeconds; }
    public boolean permissionRequired() { return permissionRequired; }
    public void permissionRequired(boolean v) { permissionRequired = v; }
    public Integer maxY() { return maxY; }

    public String permissionNode() {
        return "vaeloria.rtp.world." + worldName.toLowerCase(Locale.ROOT);
    }
}
