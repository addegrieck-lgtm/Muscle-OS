package fr.vaeloria.mines;

import fr.vaeloria.mines.model.Cuboid;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.model.Spot;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Mines en mémoire + persistance dans mines.yml (réécrit à chaque modification et à chaque réinitialisation).
 * L'échéance est sauvegardée en heure absolue : un redémarrage ne remet pas le compte à rebours à zéro.
 */
public final class MineManager {
    private final File file;
    private final Logger log;
    private final Map<String, Mine> mines = new LinkedHashMap<>();

    public MineManager(File file, Logger log) {
        this.file = file;
        this.log = log;
    }

    public Collection<Mine> all() { return mines.values(); }
    public Mine get(String id) { return id == null ? null : mines.get(id.toLowerCase(Locale.ROOT)); }
    public List<String> ids() { return new ArrayList<>(mines.keySet()); }

    /** Mine contenant ce bloc, ou null. */
    public Mine at(Block block) {
        String world = block.getWorld().getName();
        for (Mine mine : mines.values()) {
            if (mine.region() != null && mine.region().contains(world, block.getX(), block.getY(), block.getZ())) return mine;
        }
        return null;
    }

    public Mine create(String id, String name) {
        Mine mine = new Mine(id, name);
        mine.restartTimer(System.currentTimeMillis());
        mines.put(id, mine);
        save();
        return mine;
    }

    public void delete(Mine mine) {
        mines.remove(mine.id());
        save();
    }

    /** Bloc utilisable dans une mine : un vrai bloc solide ou non, mais pas l'air. */
    public static Material block(String name) {
        Material m = Material.matchMaterial(name);
        return m != null && m.isBlock() && !m.isAir() ? m : null;
    }

    public void load() {
        mines.clear();
        YamlConfiguration yaml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yaml.getConfigurationSection("mines");
        if (root == null) return;
        long now = System.currentTimeMillis();
        for (String id : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(id);
            if (s == null) continue;
            try {
                Mine mine = new Mine(id, s.getString("name", id));
                String region = s.getString("region");
                if (region != null) mine.region(Cuboid.parse(region));
                ConfigurationSection blocks = s.getConfigurationSection("blocks");
                if (blocks != null) {
                    for (String name : blocks.getKeys(false)) {
                        Material m = block(name);
                        if (m == null) log.warning("Mine " + id + " : bloc inconnu ignoré « " + name + " »");
                        else mine.composition().set(m.name(), blocks.getInt(name));
                    }
                }
                mine.restore(s.getLong("interval", 900), s.getLong("next-reset", now), s.getLong("paused-remaining", -1));
                if (s.isString("spawn")) mine.spawn(Spot.parse(s.getString("spawn")));
                if (s.isString("hologram")) mine.hologram(Spot.parse(s.getString("hologram")));
                mine.announce(s.getBoolean("announce", true));
                mine.resetPercent(s.getInt("reset-percent", 0));
                // Pas d'avertissement au chargement : on part du temps restant actuel.
                mine.lastRemaining(mine.remainingSeconds(now));
                mines.put(id.toLowerCase(Locale.ROOT), mine);
            } catch (RuntimeException e) {
                log.log(Level.WARNING, "Mine « " + id + " » illisible dans mines.yml, ignorée", e);
            }
        }
        log.info(mines.size() + " mine(s) chargée(s).");
    }

    public void save() {
        YamlConfiguration yaml = new YamlConfiguration();
        yaml.options().setHeader(List.of("Mines de VaeloriaMines — modifiées en jeu avec /mine admin."));
        for (Mine mine : mines.values()) {
            ConfigurationSection s = yaml.createSection("mines." + mine.id());
            s.set("name", mine.name());
            s.set("region", mine.region() == null ? null : mine.region().serialize());
            ConfigurationSection blocks = s.createSection("blocks");
            mine.composition().weights().forEach(blocks::set);
            s.set("interval", mine.intervalSeconds());
            s.set("next-reset", mine.nextResetAt());
            s.set("paused-remaining", mine.paused() ? mine.pausedRemaining() : null);
            s.set("spawn", mine.spawn() == null ? null : mine.spawn().serialize());
            s.set("hologram", mine.hologram() == null ? null : mine.hologram().serialize());
            s.set("announce", mine.announce());
            s.set("reset-percent", mine.resetPercent());
        }
        try {
            file.getParentFile().mkdirs();
            yaml.save(file);
        } catch (IOException e) {
            log.log(Level.SEVERE, "Impossible d'enregistrer " + file, e);
        }
    }
}
