package fr.vaeloria.villageois;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.Tag;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;

import java.util.Locale;

/** MiniMessage avec la palette du logo, identique à VaeloriaShop : <ruby> <ruby_hi> <snow> <silver> <steel> <ash> <gold> <gain> <loss>. */
public final class Text {
    static final String PREFIX = "<ruby_hi>◆</ruby_hi> <graphite>»</graphite> ";
    private static final MiniMessage MM = MiniMessage.miniMessage();
    private static final TagResolver PALETTE = TagResolver.resolver(
            color("ruby", "#A3121E"), color("ruby_hi", "#D21F2F"), color("ruby_lo", "#5E0710"),
            color("snow", "#FFFFFF"), color("silver", "#D9DCE2"), color("steel", "#A9AEB8"),
            color("ash", "#6E737E"), color("graphite", "#2A2C33"), color("gold", "#E2C27F"),
            color("gain", "#5BD17A"), color("loss", "#E0525E"), color("emerald", "#3FD47E"));

    private Text() {}

    private static TagResolver color(String name, String hex) {
        return TagResolver.resolver(name, Tag.styling(TextColor.fromHexString(hex)));
    }

    public static Component mm(String miniMessage) {
        return MM.deserialize(miniMessage, PALETTE);
    }

    public static Component prefixed(String miniMessage) {
        return mm(PREFIX + miniMessage);
    }

    /** Nom ou ligne de description d'objet : sans l'italique que Minecraft y met par défaut. */
    public static Component item(String miniMessage) {
        return mm(miniMessage).decorationIfAbsent(TextDecoration.ITALIC, TextDecoration.State.FALSE);
    }

    /** Texte venant d'un joueur ou de la config : jamais interprété comme balise. */
    public static String esc(String s) {
        return MM.escapeTags(s);
    }

    public static String plain(Component c) {
        return PlainTextComponentSerializer.plainText().serialize(c);
    }

    /** « 56 émeraudes », « 1 émeraude ». */
    public static String emeralds(int n) {
        return "<emerald>" + n + (n > 1 ? " émeraudes" : " émeraude") + "</emerald>";
    }

    public static String percent(double chance) {
        double p = chance * 100;
        return String.format(Locale.FRANCE, p >= 10 || p == 0 ? "%.0f %%" : "%.1f %%", p);
    }
}
