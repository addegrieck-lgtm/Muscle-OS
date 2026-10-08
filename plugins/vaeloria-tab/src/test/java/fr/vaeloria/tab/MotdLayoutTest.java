package fr.vaeloria.tab;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.minimessage.MiniMessage;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MotdLayoutTest {
    private final MiniMessage mm = MiniMessage.miniMessage();

    @Test
    void largeursDeLaPolice() {
        assertEquals(6 + 2 + 3 + 4, MotdLayout.width(Component.text("ail ")));
        // Le gras s'hérite des parents et ajoute 1 px par caractère hors espaces.
        assertEquals(7 + 4 + 7, MotdLayout.width(mm.deserialize("<bold>A <red>B</red></bold>")));
        assertEquals(6, MotdLayout.width(mm.deserialize("<bold><!bold>A</!bold></bold>")));
    }

    @Test
    void centreLaLigne() {
        Component line = Component.text("VAELORIA"); // 7 × 6 px + « I » 4 px = 46 px
        Component centered = MotdLayout.center(line, 270);
        assertEquals(" ".repeat((270 - 46) / 2 / 4), ((TextComponent) centered).content());
        assertEquals(line, centered.children().get(0));
    }

    @Test
    void ligneTropLargeInchangee() {
        Component wide = Component.text("W".repeat(60));
        assertSame(wide, MotdLayout.center(wide, 270));
    }

    @Test
    void logoParDefautTientSurLaLigne() {
        Shine logo = new Shine("V Æ L O R I A", "Æ", 0xD21F2F, 0xA9AEB8, 0xFFFFFF, 3, 18, true);
        Component line = mm.deserialize("◆   " + logo.render(0) + "   ◆");
        assertTrue(MotdLayout.width(line) < MotdLayout.MOTD_WIDTH);
    }
}
