package fr.vaeloria.vote;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.Tag;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import org.bukkit.Material;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** MiniMessage avec la palette du logo, identique à VaeloriaShop : <ruby> <ruby_hi> <snow> <silver> <steel> <ash> <gold> <gain> <loss>. */
final class Text {
    static final String PREFIX = "<ruby_hi>◆</ruby_hi> <graphite>»</graphite> ";
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

    static Component mm(String miniMessage) {
        return MM.deserialize(miniMessage, PALETTE);
    }

    static Component prefixed(String miniMessage) {
        return mm(PREFIX + miniMessage);
    }

    /** Texte venant d'un joueur ou de la config (pseudo, nom de site) : jamais interprété comme balise. */
    static String esc(String s) {
        return MM.escapeTags(s);
    }

    /** « 1 400 $ · 8 × Steak · 1 × Pomme dorée » — noms d'objets traduits dans la langue du joueur. */
    static String describe(Reward r, Money money) {
        List<String> parts = new ArrayList<>();
        if (r.money() > 0) parts.add("<gain>" + esc(money.format(r.money())) + "</gain>");
        r.items().forEach((name, amount) -> {
            Material m = Material.matchMaterial(name);
            String label = m != null ? "<lang:" + m.translationKey() + ">" : esc(name.toLowerCase(Locale.ROOT));
            parts.add("<snow>" + amount + " × " + label + "</snow>");
        });
        return parts.isEmpty() ? "<ash>rien</ash>" : String.join(" <ash>·</ash> ", parts);
    }

    static String duration(long millis) {
        long minutes = Math.max(1, (millis + 59_999) / 60_000);
        long h = minutes / 60, m = minutes % 60;
        if (h == 0) return m + " min";
        return m == 0 ? h + " h" : h + " h " + String.format("%02d", m);
    }
}
