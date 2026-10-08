package fr.vaeloria.factions.util;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.command.CommandSender;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Messages MiniMessage de messages.yml. Les valeurs fournies par les joueurs (noms, descriptions) sont toujours
 * insérées en texte brut (Placeholder.unparsed) : impossible d'injecter des balises.
 */
public final class Msg {
    private static final MiniMessage MM = MiniMessage.miniMessage();
    private static YamlConfiguration messages = new YamlConfiguration();
    private static String prefix = "";

    private Msg() {}

    public static void load(JavaPlugin plugin) {
        File f = new File(plugin.getDataFolder(), "messages.yml");
        if (!f.exists()) plugin.saveResource("messages.yml", false);
        YamlConfiguration cfg = YamlConfiguration.loadConfiguration(f);
        var in = plugin.getResource("messages.yml");
        if (in != null) {
            cfg.setDefaults(YamlConfiguration.loadConfiguration(new InputStreamReader(in, StandardCharsets.UTF_8)));
        }
        messages = cfg;
        prefix = cfg.getString("prefix", "");
    }

    public static MiniMessage mm() { return MM; }

    public static java.util.List<String> list(String key) {
        return messages.getStringList(key);
    }

    public static String raw(String key) {
        return messages.getString(key, "<red>[message manquant : " + key + "]");
    }

    /** Placeholders par paires : nom, valeur, nom, valeur… */
    public static TagResolver resolver(Object... kv) {
        TagResolver.Builder b = TagResolver.builder();
        b.resolver(Placeholder.parsed("prefix", prefix));
        for (int i = 0; i + 1 < kv.length; i += 2) {
            Object v = kv[i + 1];
            String name = String.valueOf(kv[i]);
            if (name.equals("color")) continue;
            if (v instanceof Component c) b.resolver(Placeholder.component(name, c));
            else b.resolver(Placeholder.unparsed(name, String.valueOf(v)));
        }
        return b.build();
    }

    /**
     * Le placeholder spécial {@code color} est une couleur MiniMessage issue du code (jamais d'un joueur) : il est
     * substitué dans le texte avant l'analyse pour pouvoir s'écrire {@code <color>…</color>}.
     */
    private static String colors(String mini, Object... kv) {
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if ("color".equals(kv[i])) {
                String c = String.valueOf(kv[i + 1]);
                mini = mini.replace("<color>", "<" + c + ">").replace("</color>", "</" + c + ">");
            }
        }
        return mini;
    }

    public static Component get(String key, Object... kv) {
        return MM.deserialize(colors(raw(key), kv), resolver(kv));
    }

    public static Component parse(String mini, Object... kv) {
        return MM.deserialize(colors(mini, kv), resolver(kv));
    }

    public static void send(CommandSender to, String key, Object... kv) {
        String r = raw(key);
        if (r.isEmpty()) return;
        to.sendMessage(MM.deserialize(colors(prefix + r, kv), resolver(kv)));
    }

    public static Component prefixed(String key, Object... kv) {
        return MM.deserialize(colors(prefix + raw(key), kv), resolver(kv));
    }

    public static String fmt(double v) {
        return (v == Math.floor(v) && !Double.isInfinite(v)) ? String.valueOf((long) v) : String.format(java.util.Locale.ROOT, "%.1f", v);
    }

    public static String duration(long ms) {
        long s = Math.max(0, ms / 1000);
        long h = s / 3600, m = (s % 3600) / 60, sec = s % 60;
        if (h > 0) return h + "h" + String.format("%02d", m);
        if (m > 0) return m + "min" + String.format("%02d", sec);
        return sec + "s";
    }
}
