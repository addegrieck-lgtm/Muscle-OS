package fr.vaeloria.tab;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.format.TextDecoration;

/**
 * Centrage d'une ligne de MOTD dans la liste des serveurs, d'après les largeurs de la police
 * Minecraft par défaut (avance en pixels, espacement compris ; +1 en gras).
 */
final class MotdLayout {
    /** Largeur utile du MOTD dans l'écran Multijoueur (305 px de ligne − icône 32 px − marges). */
    static final int MOTD_WIDTH = 270;
    private static final int SPACE = 4;

    private MotdLayout() {}

    static int charWidth(int cp, boolean bold) {
        int w = switch (cp) {
            case '!', ',', '.', ':', ';', '|', '\'', 'i' -> 2;
            case '`', 'l' -> 3;
            case ' ', 'I', 't', '[', ']' -> 4;
            case '"', '(', ')', '*', '<', '>', 'f', 'k', '{', '}' -> 5;
            case '@', '~' -> 7;
            default -> cp < 0x80 || Character.isLetterOrDigit(cp) ? 6 : 9; // symboles (◆, ▬…) : police unicode, plus large
        };
        return w + (bold && cp != ' ' ? 1 : 0);
    }

    static int width(Component c) {
        return width(c, false);
    }

    private static int width(Component c, boolean parentBold) {
        TextDecoration.State state = c.decoration(TextDecoration.BOLD);
        boolean bold = state == TextDecoration.State.NOT_SET ? parentBold : state == TextDecoration.State.TRUE;
        int w = 0;
        if (c instanceof TextComponent t) {
            w += t.content().codePoints().map(cp -> charWidth(cp, bold)).sum();
        }
        for (Component child : c.children()) w += width(child, bold);
        return w;
    }

    /** Précède la ligne des espaces qui la centrent ; inchangée si elle est déjà trop large. */
    static Component center(Component line, int area) {
        int pad = (area - width(line)) / 2 / SPACE;
        return pad <= 0 ? line : Component.text(" ".repeat(pad)).append(line);
    }
}
