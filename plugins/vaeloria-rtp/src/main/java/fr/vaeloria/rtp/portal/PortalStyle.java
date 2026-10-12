package fr.vaeloria.rtp.portal;

import org.bukkit.Color;
import org.bukkit.Material;
import org.bukkit.Particle;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Logger;

/**
 * Apparence d'un portail : un mélange pondéré de particules (section portals.styles de config.yml).
 * DUST et DUST_COLOR_TRANSITION acceptent n'importe quelle couleur ; les autres particules sont celles du jeu.
 */
public final class PortalStyle {
    private record Layer(Particle particle, Object data, int weight) {}

    private final String id;
    private final String displayName;
    private final Material icon;
    private final List<Layer> layers;
    private final int totalWeight;

    private PortalStyle(String id, String displayName, Material icon, List<Layer> layers) {
        this.id = id;
        this.displayName = displayName;
        this.icon = icon;
        this.layers = layers;
        this.totalWeight = layers.stream().mapToInt(Layer::weight).sum();
    }

    public static PortalStyle load(String id, ConfigurationSection s, Logger log) {
        List<Layer> layers = new ArrayList<>();
        for (Map<?, ?> raw : s.getMapList("layers")) {
            try {
                layers.add(layer(raw));
            } catch (IllegalArgumentException e) {
                log.warning("Style de portail « " + id + " » : couche ignorée (" + e.getMessage() + ")");
            }
        }
        if (layers.isEmpty()) layers.add(new Layer(Particle.PORTAL, null, 1));
        Material icon = Material.matchMaterial(s.getString("icon", "ENDER_EYE"));
        return new PortalStyle(id, s.getString("display-name", id), icon == null ? Material.ENDER_EYE : icon, layers);
    }

    private static Layer layer(Map<?, ?> raw) {
        Object name = raw.get("particle");
        if (name == null) throw new IllegalArgumentException("« particle » manquant");
        Particle particle;
        try {
            particle = Particle.valueOf(name.toString().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("particule inconnue : " + name);
        }
        float size = raw.get("size") instanceof Number n ? n.floatValue() : 1.0f;
        int weight = raw.get("weight") instanceof Number n ? Math.max(1, n.intValue()) : 1;
        Object data;
        if (particle == Particle.DUST) {
            data = new Particle.DustOptions(color(raw.get("color")), size);
        } else if (particle == Particle.DUST_COLOR_TRANSITION) {
            data = new Particle.DustTransition(color(raw.get("from")), color(raw.get("to")), size);
        } else if (particle.getDataType() == Void.class) {
            data = null;
        } else {
            throw new IllegalArgumentException(particle + " demande des données non prises en charge");
        }
        return new Layer(particle, data, weight);
    }

    private static Color color(Object raw) {
        return Color.fromRGB(Colors.parse(raw == null ? null : raw.toString()));
    }

    /** Une particule à cette position, couche tirée selon les poids. Visible des joueurs proches. */
    public void spawn(World world, double x, double y, double z) {
        Layer layer = pick();
        world.spawnParticle(layer.particle(), x, y, z, 1, 0, 0, 0, 0, layer.data(), false);
    }

    /** Gerbe de particules (arrivée d'un joueur). */
    public void burst(World world, double x, double y, double z, int count) {
        ThreadLocalRandom r = ThreadLocalRandom.current();
        for (int i = 0; i < count; i++) {
            spawn(world, x + r.nextDouble(-0.6, 0.6), y + r.nextDouble(0, 2), z + r.nextDouble(-0.6, 0.6));
        }
    }

    private Layer pick() {
        int roll = ThreadLocalRandom.current().nextInt(totalWeight);
        for (Layer l : layers) {
            roll -= l.weight();
            if (roll < 0) return l;
        }
        return layers.getLast();
    }

    public String id() { return id; }
    public String displayName() { return displayName; }
    public Material icon() { return icon; }
}
