package fr.vaeloria.rtp;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.command.CommandSender;

/** Messages configurables (section « messages » de config.yml), au format MiniMessage. */
public final class Messages {
    private static final MiniMessage MM = MiniMessage.miniMessage();
    private final VaeloriaRtpPlugin plugin;

    public Messages(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
    }

    public void send(CommandSender to, String key, TagResolver... placeholders) {
        String raw = raw(key);
        if (raw.isEmpty()) return; // message désactivé
        to.sendMessage(parse(raw, placeholders));
    }

    public Component component(String key, TagResolver... placeholders) {
        return parse(raw(key), placeholders);
    }

    public String raw(String key) {
        // Sans valeur par défaut explicite : une clé absente d'un ancien config.yml reprend le texte du jar.
        String raw = plugin.getConfig().getString("messages." + key);
        return raw == null ? key : raw;
    }

    public Component parse(String raw, TagResolver... placeholders) {
        TagResolver prefix = Placeholder.parsed("prefix", raw("prefix").equals("prefix") ? "" : raw("prefix"));
        return MM.deserialize(raw, TagResolver.resolver(TagResolver.resolver(placeholders), prefix));
    }

    /** Texte d'interface (noms et lores d'objets) : sans l'italique imposé par Minecraft. */
    public static Component ui(String raw, TagResolver... placeholders) {
        return MM.deserialize(raw, placeholders).decorationIfAbsent(TextDecoration.ITALIC, TextDecoration.State.FALSE);
    }

    public static String escape(String text) {
        return MM.escapeTags(text);
    }

    public static TagResolver p(String name, Object value) {
        return Placeholder.unparsed(name, String.valueOf(value));
    }

    /** Placeholder dont la valeur contient elle-même du MiniMessage (ex. nom affiché d'un monde). */
    public static TagResolver rich(String name, String miniMessage) {
        return Placeholder.parsed(name, miniMessage);
    }
}
