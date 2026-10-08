package fr.vaeloria.tab;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Configuration lue depuis config.yml, immuable : un rechargement crée une nouvelle instance. */
record TabSettings(String serverName, int refreshTicks, int namesRefreshTicks,
                   Map<String, String> palette, Shine logo, String header, String footer,
                   Thresholds ping, Thresholds tps, List<Rank> ranks) {

    static TabSettings load(FileConfiguration c) {
        Map<String, String> palette = new LinkedHashMap<>();
        ConfigurationSection pal = c.getConfigurationSection("palette");
        if (pal != null) {
            for (String key : pal.getKeys(false)) {
                String hex = pal.getString(key, "");
                Shine.parse(hex); // valide le format dès le chargement
                palette.put(key, hex.startsWith("#") ? hex : "#" + hex);
            }
        }

        Shine logo = new Shine(
                c.getString("logo.text", "V Æ L O R I A"),
                c.getString("logo.accent", "Æ"),
                Shine.parse(c.getString("logo.accent-color", "#D21F2F")),
                Shine.parse(c.getString("logo.base-color", "#A9AEB8")),
                Shine.parse(c.getString("logo.shine-color", "#FFFFFF")),
                c.getInt("logo.shine-width", 3),
                c.getInt("logo.pause-frames", 18),
                c.getBoolean("logo.bold", true));

        Thresholds ping = new Thresholds(
                c.getDouble("ping.good-below", 80), c.getDouble("ping.medium-below", 180), false,
                c.getString("ping.good", "#E6E8EC"), c.getString("ping.medium", "#A9AEB8"), c.getString("ping.bad", "#D21F2F"));
        Thresholds tps = new Thresholds(
                c.getDouble("tps.good-above", 19.0), c.getDouble("tps.medium-above", 16.0), true,
                c.getString("tps.good", "#E6E8EC"), c.getString("tps.medium", "#A9AEB8"), c.getString("tps.bad", "#D21F2F"));

        List<Rank> ranks = new ArrayList<>();
        ConfigurationSection rs = c.getConfigurationSection("ranks");
        if (rs != null) {
            for (String key : rs.getKeys(false)) {
                ConfigurationSection r = rs.getConfigurationSection(key);
                if (r == null) continue;
                ranks.add(new Rank(key, r.getString("permission", ""), r.getInt("order", 0),
                        r.getString("display", key), r.getString("format", "<player>"),
                        r.getString("chat"), r.getString("join"), r.getString("quit")));
            }
        }

        return new TabSettings(
                c.getString("server-name", "Factions"),
                Math.max(1, c.getInt("refresh-ticks", 3)),
                Math.max(1, c.getInt("names-refresh-ticks", 40)),
                palette, logo,
                String.join("\n", c.getStringList("header")),
                String.join("\n", c.getStringList("footer")),
                ping, tps, List.copyOf(ranks));
    }
}
