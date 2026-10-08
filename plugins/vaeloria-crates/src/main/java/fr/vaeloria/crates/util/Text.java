package fr.vaeloria.crates.util;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;

/** Textes avec codes couleur « & » (configurables par les admins) → composants Adventure. */
public final class Text {
    private Text() {}

    private static final LegacyComponentSerializer LEGACY = LegacyComponentSerializer.legacyAmpersand();

    /** Pas d'italique par défaut : sinon Minecraft met en italique tout nom/lore personnalisé. */
    public static Component of(String s) {
        return LEGACY.deserialize(s).decoration(TextDecoration.ITALIC, false);
    }

    public static String legacy(Component c) {
        return LEGACY.serialize(c);
    }

    public static String plain(Component c) {
        return PlainTextComponentSerializer.plainText().serialize(c);
    }
}
