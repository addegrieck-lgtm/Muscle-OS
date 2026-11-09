package fr.vaeloria.jobs;

import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.PlayerJobs;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.InvalidConfigurationException;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;

/** Un fichier YAML par joueur ({@code players/<uuid>.yml}), écrit de façon atomique. */
final class Storage {
    private final Path players;

    Storage(Path dataFolder) throws IOException {
        this.players = dataFolder.resolve("players");
        Files.createDirectories(players);
    }

    PlayerJobs load(UUID uuid) throws IOException {
        Path f = players.resolve(uuid + ".yml");
        PlayerJobs data = new PlayerJobs();
        if (!Files.exists(f)) return data;
        YamlConfiguration y = new YamlConfiguration();
        try {
            y.loadFromString(Files.readString(f, StandardCharsets.UTF_8));
        } catch (InvalidConfigurationException e) {
            throw new IOException("Fichier joueur illisible : " + f, e);
        }
        ConfigurationSection jobs = y.getConfigurationSection("jobs");
        if (jobs == null) return data;
        for (String id : jobs.getKeys(false)) {
            ConfigurationSection s = jobs.getConfigurationSection(id);
            if (s == null) continue;
            JobProgress p = data.get(id);
            p.setXp(s.getDouble("xp"));
            p.unlocked().addAll(s.getStringList("nodes"));
            p.setLastReset(s.getLong("last-reset"));
        }
        return data;
    }

    /** À appeler sur le thread principal : renvoie le texte à écrire (l'écriture peut partir en asynchrone). */
    static String serialize(PlayerJobs data) {
        YamlConfiguration y = new YamlConfiguration();
        for (Map.Entry<String, JobProgress> e : data.all().entrySet()) {
            String base = "jobs." + e.getKey();
            y.set(base + ".xp", Math.round(e.getValue().xp() * 100) / 100.0);
            y.set(base + ".nodes", new ArrayList<>(e.getValue().unlocked()));
            if (e.getValue().lastReset() > 0) y.set(base + ".last-reset", e.getValue().lastReset());
        }
        return y.saveToString();
    }

    void write(UUID uuid, String yaml) throws IOException {
        Path target = players.resolve(uuid + ".yml");
        Path tmp = target.resolveSibling(target.getFileName() + ".tmp");
        synchronized (this) {
            Files.writeString(tmp, yaml, StandardCharsets.UTF_8);
            Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        }
    }
}
