package fr.vaeloria.staff.util;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

/**
 * Textes saisis par les admins → composants Adventure.
 * Codes « & » classiques, couleurs hexadécimales « &#ff8800 », liens http(s) cliquables.
 */
public final class Text {
    private Text() {}

    private static final LegacyComponentSerializer LEGACY = LegacyComponentSerializer.builder()
            .character('&').hexColors().extractUrls().build();

    /** Pas d'italique par défaut : sinon Minecraft met en italique tout nom/lore personnalisé. */
    public static Component of(String s) {
        return LEGACY.deserialize(s).decoration(TextDecoration.ITALIC, false);
    }

    public static String plain(Component c) {
        return PlainTextComponentSerializer.plainText().serialize(c);
    }

    /** Nom sans couleurs (journaux, listes). */
    public static String strip(String s) {
        return plain(of(s));
    }

    /** Variables : {player}, {online}, {max}, {world}. {@code player} peut être nul (console, annonce globale). */
    public static String placeholders(String s, Player player) {
        String out = s.replace("{online}", String.valueOf(Bukkit.getOnlinePlayers().size()))
                .replace("{max}", String.valueOf(Bukkit.getMaxPlayers()));
        if (player != null) {
            out = out.replace("{player}", player.getName()).replace("{world}", player.getWorld().getName());
        }
        return out;
    }
}
