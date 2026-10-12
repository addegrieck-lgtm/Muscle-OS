package fr.vaeloria.tab;

import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Configuration lue depuis config.yml, immuable : un rechargement crée une nouvelle instance. */
record TabSettings(String serverName, int refreshTicks, int namesRefreshTicks, int maxShown,
                   Map<String, String> palette, Shine logo, String header, String footer,
                   int compactAbove, String compactHeader, String compactFooter,
                   Thresholds ping, Thresholds tps, List<Rank> ranks) {

    /**
     * Section du fichier, ou celle du config.yml d'origine (dans le jar) si elle manque ou est vide : sinon un
     * config.yml incomplet afficherait les balises de couleur en texte brut (« &lt;ruby_lo&gt; »).
     */
    static ConfigurationSection section(FileConfiguration c, String path) {
        // get(path, null) : getConfigurationSection créerait une section vide dans le fichier si elle n'existe pas.
        ConfigurationSection own = c.get(path, null) instanceof ConfigurationSection cs ? cs : null;
        if (own != null && !own.getKeys(false).isEmpty()) return own;
        org.bukkit.configuration.Configuration defaults = c.getDefaults();
        if (defaults != null && defaults.isConfigurationSection(path)) return defaults.getConfigurationSection(path);
        return own;
    }

    private static String fromDefaults(FileConfiguration c, String path, String fallback) {
        org.bukkit.configuration.Configuration defaults = c.getDefaults();
        return defaults != null && defaults.isString(path) ? defaults.getString(path) : fallback;
    }

    /** Ce qui manque dans le config.yml du serveur (remplacé par les valeurs d'origine) : pour prévenir l'admin. */
    static List<String> missing(FileConfiguration c) {
        List<String> out = new ArrayList<>();
        // contains(…, true) : ce qui est réellement dans le fichier, sans les valeurs d'origine du jar.
        if (!c.contains("palette", true)) out.add("palette");
        if (!c.contains("ranks", true)) out.add("ranks");
        else for (String key : c.getConfigurationSection("ranks").getKeys(false)) {
            if (!c.contains("ranks." + key + ".display", true)) out.add("ranks." + key + ".display");
        }
        return out;
    }

    static TabSettings load(FileConfiguration c) {
        Map<String, String> palette = new LinkedHashMap<>();
        ConfigurationSection pal = section(c, "palette");
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
        ConfigurationSection rs = section(c, "ranks");
        if (rs != null) {
            for (String key : rs.getKeys(false)) {
                ConfigurationSection r = rs.getConfigurationSection(key);
                if (r == null) continue;
                ranks.add(new Rank(key, r.getString("permission", ""), r.getInt("order", 0),
                        r.getString("display", fromDefaults(c, "ranks." + key + ".display", key)),
                        r.getString("format", fromDefaults(c, "ranks." + key + ".format", "<player>")), r.getString("compact"),
                        r.getString("chat"), r.getString("join"), r.getString("quit")));
            }
        }

        return new TabSettings(
                c.getString("server-name", "Factions"),
                Math.max(1, c.getInt("refresh-ticks", 3)),
                Math.max(1, c.getInt("names-refresh-ticks", 40)),
                c.getInt("max-shown", 75),
                palette, logo,
                String.join("\n", c.getStringList("header")),
                String.join("\n", c.getStringList("footer")),
                c.getInt("compact.above", 40),
                lines(c, "compact.header", "header"),
                lines(c, "compact.footer", "footer"),
                ping, tps, List.copyOf(ranks));
    }

    /** Lignes de {@code key}, ou celles de {@code fallback} si la section est absente. */
    private static String lines(FileConfiguration c, String key, String fallback) {
        return String.join("\n", c.getStringList(c.isList(key) ? key : fallback));
    }
}
