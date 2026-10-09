package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.YamlFiles;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Joueurs réduits au silence (mutes.yml). Lu depuis le thread du chat : structure concurrente. */
public final class Mutes {
    /** {@code until} = horodatage de fin en ms, ou -1 si définitif. */
    public record Mute(String name, long until, String reason, String by) {
        public boolean expired() {
            return until >= 0 && System.currentTimeMillis() >= until;
        }
    }

    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final Map<UUID, Mute> mutes = new ConcurrentHashMap<>();

    public Mutes(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "mutes.yml");
    }

    /** @return le mute en cours, ou {@code null} (les mutes expirés sont retirés). */
    public Mute get(UUID id) {
        Mute m = mutes.get(id);
        if (m != null && m.expired()) {
            mutes.remove(id);
            return null;
        }
        return m;
    }

    public void mute(UUID id, Mute mute) {
        mutes.put(id, mute);
        save();
    }

    public boolean unmute(UUID id) {
        boolean had = mutes.remove(id) != null;
        if (had) save();
        return had;
    }

    public void load() {
        mutes.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yml.getConfigurationSection("mutes");
        if (root == null) return;
        for (String key : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(key);
            try {
                Mute m = new Mute(s.getString("name", "?"), s.getLong("until", -1), s.getString("reason", ""), s.getString("by", "?"));
                if (!m.expired()) mutes.put(UUID.fromString(key), m);
            } catch (IllegalArgumentException ignored) {
                // entrée corrompue : ignorée
            }
        }
    }

    public synchronized void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("Mutes VaeloriaStaff (until = fin en millisecondes, -1 = définitif)."));
        mutes.forEach((id, m) -> {
            if (m.expired()) return;
            String base = "mutes." + id + ".";
            yml.set(base + "name", m.name());
            yml.set(base + "until", m.until());
            yml.set(base + "reason", m.reason());
            yml.set(base + "by", m.by());
        });
        YamlFiles.save(yml, file, plugin.getLogger());
    }
}
