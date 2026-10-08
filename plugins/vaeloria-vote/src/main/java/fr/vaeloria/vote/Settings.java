package fr.vaeloria.vote;

import org.bukkit.Material;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/** Lecture de config.yml. Une valeur invalide est signalée dans la console et remplacée par un défaut sûr. */
record Settings(List<VoteSite> sites, Reward perVote, Reward allSitesBonus, double moneyCapPerDay,
                String moneyCommand, String currencySymbol, ZoneId zone,
                int requiredSites, Wheel classic, Wheel risky, int broadcastMinMultiplier, boolean broadcastLoss,
                long reminderIntervalMillis, long reminderFirstDelayMillis, boolean reminderTitle, boolean reminderSound,
                boolean broadcastVotes, boolean testMode, int checkTimeoutSeconds) {

    static Settings load(FileConfiguration c, Logger log) {
        List<VoteSite> sites = new ArrayList<>();
        ConfigurationSection s = c.getConfigurationSection("sites");
        if (s != null) {
            for (String id : s.getKeys(false)) {
                ConfigurationSection site = s.getConfigurationSection(id);
                if (site == null) continue;
                Pattern success = null;
                String regex = site.getString("success-regex", "");
                if (!regex.isBlank()) {
                    try {
                        success = Pattern.compile(regex);
                    } catch (PatternSyntaxException e) {
                        log.warning("sites." + id + ".success-regex invalide : vérification API désactivée pour ce site.");
                    }
                }
                sites.add(new VoteSite(id, site.getString("name", id), site.getString("url", ""),
                        Math.max(1, site.getInt("cooldown-minutes", 1440)),
                        site.getString("check-url", ""), site.getString("api-key", ""), success,
                        site.getString("votifier-service", "")));
            }
        }
        if (sites.isEmpty()) log.severe("Aucun site de vote dans config.yml (section sites).");

        ZoneId zone;
        try {
            zone = ZoneId.of(c.getString("timezone", "Europe/Paris"));
        } catch (Exception e) {
            log.warning("timezone invalide : Europe/Paris utilisé.");
            zone = ZoneId.of("Europe/Paris");
        }

        Wheel classic = wheel(c.getConfigurationSection("wheel.classic"), "wheel.classic", log,
                List.of(new Wheel.Slice(1, 50), new Wheel.Slice(2, 35), new Wheel.Slice(3, 15)));
        Wheel risky = wheel(c.getConfigurationSection("wheel.risky"), "wheel.risky", log,
                List.of(new Wheel.Slice(4, 40), new Wheel.Slice(0, 60)));
        int required = c.getInt("wheel.required-sites", sites.size());
        required = Math.max(1, Math.min(required, Math.max(1, sites.size())));

        return new Settings(List.copyOf(sites),
                reward(c.getConfigurationSection("rewards.per-vote"), "rewards.per-vote", log),
                reward(c.getConfigurationSection("rewards.all-sites-bonus"), "rewards.all-sites-bonus", log),
                Math.max(0, c.getDouble("economy.max-money-per-day", 0)),
                c.getString("economy.money-command", ""), c.getString("economy.currency-symbol", "$"), zone,
                required, classic, risky,
                c.getInt("wheel.broadcast-min-multiplier", 3), c.getBoolean("wheel.broadcast-loss", true),
                Math.max(1, c.getInt("reminder.interval-minutes", 30)) * 60_000L,
                Math.max(0, c.getInt("reminder.first-delay-seconds", 20)) * 1000L,
                c.getBoolean("reminder.title", true), c.getBoolean("reminder.sound", true),
                c.getBoolean("broadcast-votes", true),
                c.getBoolean("verification.test-mode", false),
                Math.max(2, c.getInt("verification.timeout-seconds", 6)));
    }

    private static Reward reward(ConfigurationSection s, String path, Logger log) {
        if (s == null) return Reward.NONE;
        Map<String, Integer> items = new LinkedHashMap<>();
        ConfigurationSection i = s.getConfigurationSection("items");
        if (i != null) {
            for (String name : i.getKeys(false)) {
                if (Material.matchMaterial(name) == null) {
                    log.warning(path + ".items." + name + " : objet inconnu, ignoré.");
                    continue;
                }
                items.put(name, Math.max(0, i.getInt(name)));
            }
        }
        return new Reward(Math.max(0, s.getDouble("money", 0)), items);
    }

    private static Wheel wheel(ConfigurationSection s, String path, Logger log, List<Wheel.Slice> fallback) {
        if (s == null) return new Wheel(fallback);
        List<Wheel.Slice> slices = new ArrayList<>();
        try {
            for (String key : s.getKeys(false)) slices.add(new Wheel.Slice(Integer.parseInt(key.replace("x", "")), s.getInt(key)));
            return new Wheel(slices);
        } catch (IllegalArgumentException e) {
            log.warning(path + " invalide (" + e.getMessage() + ") : roue par défaut utilisée.");
            return new Wheel(fallback);
        }
    }

    VoteSite site(String id) {
        for (VoteSite site : sites) if (site.id().equalsIgnoreCase(id)) return site;
        return null;
    }
}
