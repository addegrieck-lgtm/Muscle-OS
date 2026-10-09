package fr.vaeloria.staff.hologram;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Pos;
import fr.vaeloria.staff.util.Text;
import fr.vaeloria.staff.util.YamlFiles;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.TextDisplay;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.util.Transformation;
import org.joml.AxisAngle4f;
import org.joml.Vector3f;

import java.io.File;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;

/**
 * Pancartes en mémoire + holograms.yml.
 * Les entités ne sont pas enregistrées dans le monde (setPersistent(false)) : elles disparaissent quand le chunk
 * se décharge et sont recréées par {@link #tick()} quand il est de nouveau chargé. Aucun doublon possible après
 * un redémarrage ou un plantage.
 */
public final class HologramManager {
    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final NamespacedKey tag;
    private final Map<String, Hologram> holograms = new LinkedHashMap<>();

    public HologramManager(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "holograms.yml");
        this.tag = new NamespacedKey(plugin, "hologram");
    }

    public Collection<Hologram> all() { return holograms.values(); }
    public Hologram get(String id) { return id == null ? null : holograms.get(id.toLowerCase()); }
    public List<String> ids() { return new ArrayList<>(holograms.keySet()); }
    public boolean exists(String id) { return holograms.containsKey(id); }

    public Hologram create(String id, Location at, String firstLine) {
        Hologram h = new Hologram(id, Pos.of(at));
        h.lines().add(firstLine);
        holograms.put(id, h);
        save();
        spawn(h);
        return h;
    }

    public void delete(Hologram h) {
        despawn(h);
        holograms.remove(h.id());
        save();
    }

    public void move(Hologram h, Location to) {
        h.pos(Pos.of(to));
        despawn(h);
        save();
        spawn(h);
    }

    /** Applique les modifications (texte, taille, fond…) à l'entité affichée et enregistre. */
    public void update(Hologram h) {
        save();
        if (entity(h) instanceof TextDisplay d) apply(h, d);
        else spawn(h);
    }

    // ---- Entités ----

    private Entity entity(Hologram h) {
        if (h.entity == null) return null;
        Entity e = Bukkit.getEntity(h.entity);
        return e != null && e.isValid() ? e : null;
    }

    private void spawn(Hologram h) {
        if (entity(h) != null || !h.pos().isLoaded()) return;
        Location loc = h.pos().toLocation();
        if (loc == null) return;
        TextDisplay d = loc.getWorld().spawn(loc, TextDisplay.class, display -> {
            display.setPersistent(false);
            display.getPersistentDataContainer().set(tag, PersistentDataType.STRING, h.id());
            apply(h, display);
        });
        h.entity = d.getUniqueId();
    }

    private void despawn(Hologram h) {
        Entity e = entity(h);
        if (e != null) e.remove();
        h.entity = null;
    }

    private static void apply(Hologram h, TextDisplay d) {
        Component text = Component.empty();
        for (int i = 0; i < h.lines().size(); i++) {
            if (i > 0) text = text.append(Component.newline());
            text = text.append(Text.of(Text.placeholders(h.lines().get(i), null)));
        }
        d.text(text);
        d.setBillboard(h.billboard());
        d.setShadowed(h.shadow());
        d.setAlignment(TextDisplay.TextAlignment.CENTER);
        d.setLineWidth(400);
        switch (h.background()) {
            case DEFAULT -> d.setDefaultBackground(true);
            case NONE -> {
                d.setDefaultBackground(false);
                d.setBackgroundColor(Color.fromARGB(0, 0, 0, 0));
            }
            case DARK -> {
                d.setDefaultBackground(false);
                d.setBackgroundColor(Color.fromARGB(150, 0, 0, 0));
            }
        }
        float s = h.scale();
        d.setTransformation(new Transformation(new Vector3f(), new AxisAngle4f(), new Vector3f(s, s, s), new AxisAngle4f()));
        d.setViewRange(Math.max(1f, s));
    }

    /** Appelé régulièrement : (re)crée les pancartes dont le chunk est chargé, met à jour {online}. */
    public void tick() {
        for (Hologram h : holograms.values()) {
            Entity e = entity(h);
            if (e == null) spawn(h);
            else if (e instanceof TextDisplay d && h.lines().stream().anyMatch(l -> l.contains("{"))) apply(h, d);
        }
    }

    public void despawnAll() {
        holograms.values().forEach(this::despawn);
    }

    /** L'entité est-elle une pancarte de ce plugin ? */
    public String idOf(Entity e) {
        return e.getPersistentDataContainer().get(tag, PersistentDataType.STRING);
    }

    // ---- Persistance ----

    public void load() {
        despawnAll();
        holograms.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yml.getConfigurationSection("holograms");
        if (root != null) {
            for (String id : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(id);
                try {
                    Pos pos = Pos.read(s, "location");
                    if (pos == null) throw new IllegalArgumentException("position manquante");
                    Hologram h = new Hologram(id, pos);
                    h.lines().addAll(s.getStringList("lines"));
                    h.scale((float) s.getDouble("scale", 1));
                    h.background(Hologram.Background.valueOf(s.getString("background", "DARK")));
                    h.billboard(Display.Billboard.valueOf(s.getString("billboard", "CENTER")));
                    h.shadow(s.getBoolean("shadow", true));
                    holograms.put(id, h);
                } catch (RuntimeException e) {
                    plugin.getLogger().log(Level.WARNING, "Pancarte illisible ignorée : " + id, e);
                }
            }
        }
        plugin.getLogger().info(holograms.size() + " pancarte(s) chargée(s)");
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("Pancartes (hologrammes) VaeloriaStaff — modifiées en jeu avec /staff → Pancartes."));
        for (Hologram h : holograms.values()) {
            ConfigurationSection s = yml.createSection("holograms." + h.id());
            h.pos().write(s, "location");
            s.set("lines", new ArrayList<>(h.lines()));
            s.set("scale", (double) h.scale());
            s.set("background", h.background().name());
            s.set("billboard", h.billboard().name());
            s.set("shadow", h.shadow());
        }
        YamlFiles.save(yml, file, plugin.getLogger());
    }
}
