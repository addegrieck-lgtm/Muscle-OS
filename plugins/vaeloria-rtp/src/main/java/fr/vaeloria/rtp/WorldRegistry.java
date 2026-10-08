package fr.vaeloria.rtp;

import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Level;

/** Mondes RTP configurés, persistés dans plugins/VaeloriaRTP/worlds.yml. */
public final class WorldRegistry {
    private final VaeloriaRtpPlugin plugin;
    private final File file;
    private final Map<String, RtpWorld> worlds = new LinkedHashMap<>();

    public WorldRegistry(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "worlds.yml");
    }

    public void load() {
        if (!file.exists()) plugin.saveResource("worlds.yml", false);
        worlds.clear();
        ConfigurationSection root = YamlConfiguration.loadConfiguration(file).getConfigurationSection("worlds");
        if (root == null) return;
        for (String name : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(name);
            worlds.put(name.toLowerCase(Locale.ROOT), RtpWorld.fromMap(name, s == null ? null : s.getValues(false)));
        }
    }

    public void save() {
        YamlConfiguration yaml = new YamlConfiguration();
        yaml.options().setHeader(List.of(
                "Mondes du RTP VÆLORIA. Modifiable en jeu avec /rtpadmin (recommandé) ou à la main puis /rtpadmin reload.",
                "Couleurs et styles : format MiniMessage (https://docs.advntr.dev/minimessage/format.html)."));
        for (RtpWorld w : worlds.values()) yaml.set("worlds." + w.worldName(), w.toMap());
        try {
            yaml.save(file);
        } catch (IOException e) {
            plugin.getLogger().log(Level.SEVERE, "Impossible d'enregistrer worlds.yml", e);
        }
    }

    public RtpWorld get(String name) {
        return name == null ? null : worlds.get(name.toLowerCase(Locale.ROOT));
    }

    /** Ajoute un monde avec des réglages par défaut adaptés à son type. Renvoie l'existant s'il y est déjà. */
    public RtpWorld add(World world) {
        RtpWorld existing = get(world.getName());
        if (existing != null) return existing;
        RtpWorld w = new RtpWorld(world.getName());
        switch (world.getEnvironment()) {
            case NETHER -> {
                w.set("icon", "NETHERRACK");
                w.set("display-name", "<red>" + world.getName());
                w.set("max-radius", "2000");
                w.set("min-radius", "100");
                w.set("max-y", "120");
            }
            case THE_END -> {
                w.set("icon", "END_STONE");
                w.set("display-name", "<light_purple>" + world.getName());
                w.set("min-radius", "1000");
                w.set("max-radius", "4000");
            }
            default -> w.set("display-name", "<green>" + world.getName());
        }
        worlds.put(world.getName().toLowerCase(Locale.ROOT), w);
        save();
        return w;
    }

    public boolean remove(String name) {
        boolean removed = worlds.remove(name.toLowerCase(Locale.ROOT)) != null;
        if (removed) save();
        return removed;
    }

    public Collection<RtpWorld> all() {
        List<RtpWorld> list = new ArrayList<>(worlds.values());
        list.sort(Comparator.comparingInt((RtpWorld w) -> w.slot() < 0 ? Integer.MAX_VALUE : w.slot())
                .thenComparing(RtpWorld::worldName));
        return list;
    }

    /** Mondes chargés sur le serveur mais pas encore configurés pour le RTP. */
    public List<World> unconfigured() {
        return Bukkit.getWorlds().stream().filter(w -> get(w.getName()) == null).toList();
    }
}
