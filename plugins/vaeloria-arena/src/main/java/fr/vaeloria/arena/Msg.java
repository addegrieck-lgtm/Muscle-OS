package fr.vaeloria.arena;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;

import java.util.Locale;

/** Messages MiniMessage de l'arène. */
final class Msg {
    static final MiniMessage MM = MiniMessage.miniMessage();
    static final String PREFIX = "<dark_gray>[<gold>Arène</gold>]</dark_gray> ";

    private Msg() {}

    static Component of(String mini, TagResolver... resolvers) {
        return MM.deserialize(PREFIX + mini, resolvers);
    }

    static String color(Team t) {
        return t == Team.ROUGE ? "red" : "blue";
    }

    /** « <red>Rouge</red> » */
    static String team(Team t) {
        return "<" + color(t) + ">" + t.label + "</" + color(t) + ">";
    }

    static String odds(double o) {
        return o <= 0 ? "—" : String.format(Locale.FRANCE, "×%.2f", o);
    }

    /** Texte venant de l'économie ou d'un joueur : jamais interprété comme balise. */
    static String esc(String s) {
        return MM.escapeTags(s);
    }
}
