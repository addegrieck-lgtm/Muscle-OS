package fr.vaeloria.jobs;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.Tag;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;

import java.util.Locale;

/** MiniMessage avec la palette du logo, identique aux autres plugins VÆLORIA. */
public final class Text {
    public static final String PREFIX = "<ruby_hi>◆</ruby_hi> <graphite>»</graphite> ";
    private static final MiniMessage MM = MiniMessage.miniMessage();
    private static final TagResolver PALETTE = TagResolver.resolver(
            color("ruby", "#A3121E"), color("ruby_hi", "#D21F2F"), color("ruby_lo", "#5E0710"),
            color("snow", "#FFFFFF"), color("silver", "#D9DCE2"), color("steel", "#A9AEB8"),
            color("ash", "#6E737E"), color("graphite", "#2A2C33"), color("gold", "#E2C27F"),
            color("gain", "#5BD17A"), color("loss", "#E0525E"));

    private Text() {}

    private static TagResolver color(String name, String hex) {
        return TagResolver.resolver(name, Tag.styling(TextColor.fromHexString(hex)));
    }

    public static Component mm(String miniMessage) {
        return MM.deserialize(miniMessage, PALETTE);
    }

    /** Pour les noms et lores d'objets : pas d'italique par défaut. */
    public static Component item(String miniMessage) {
        return mm(miniMessage).decorationIfAbsent(TextDecoration.ITALIC, TextDecoration.State.FALSE);
    }

    public static Component prefixed(String miniMessage) {
        return mm(PREFIX + miniMessage);
    }

    /** Texte venant d'un joueur ou de la config : jamais interprété comme balise. */
    public static String esc(String s) {
        return MM.escapeTags(s);
    }

    /** 1 234,5 */
    public static String number(double v) {
        if (v == Math.rint(v)) return String.format(Locale.FRANCE, "%,d", (long) v).replace(' ', ' ').replace(' ', ' ');
        return String.format(Locale.FRANCE, "%,.1f", v).replace(' ', ' ').replace(' ', ' ');
    }

    /** Barre de progression ▰▰▰▱▱▱. */
    public static String bar(double progress, int width) {
        int full = (int) Math.round(Math.max(0, Math.min(1, progress)) * width);
        return "<gain>" + "▰".repeat(full) + "</gain><ash>" + "▱".repeat(width - full) + "</ash>";
    }

    public static String hours(long millis) {
        long minutes = Math.max(1, (millis + 59_999) / 60_000);
        long h = minutes / 60, m = minutes % 60;
        if (h == 0) return m + " min";
        return m == 0 ? h + " h" : h + " h " + String.format("%02d", m);
    }
}
