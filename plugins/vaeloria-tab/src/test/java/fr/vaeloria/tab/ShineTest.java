package fr.vaeloria.tab;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ShineTest {
    private final Shine shine = new Shine("V Æ L", "Æ", 0xD21F2F, 0xA9AEB8, 0xFFFFFF, 2, 4, false);

    @Test
    void accentResteRubisQuelleQueSoitLImage() {
        for (int f = 0; f < shine.cycle() * 2; f++) {
            assertTrue(shine.render(f).contains("<#D21F2F>Æ</#D21F2F>"), "image " + f);
        }
    }

    @Test
    void refletBalaieLeNomPuisPause() {
        // Image où le reflet est centré sur le « V » (index 0) : V blanc pur.
        int onV = shine.width();
        assertEquals(1.0, shine.intensity(0, onV));
        assertTrue(shine.render(onV).startsWith("<#FFFFFF>V</#FFFFFF>"));
        // Pendant la pause : tout est argent de base.
        int paused = shine.cycle() - 1;
        for (int i = 0; i < shine.text().length(); i++) assertEquals(0.0, shine.intensity(i, paused));
        assertTrue(shine.render(paused).startsWith("<#A9AEB8>V</#A9AEB8>"));
    }

    @Test
    void espacesNonColoresEtGrasOptionnel() {
        assertEquals("<#A9AEB8>V</#A9AEB8> <#D21F2F>Æ</#D21F2F> <#A9AEB8>L</#A9AEB8>", shine.render(shine.cycle() - 1));
        Shine bold = new Shine("V", "Æ", 0, 0, 0, 1, 0, true);
        assertEquals("<bold><#000000>V</#000000></bold>", bold.render(0));
    }

    @Test
    void echappeLesBalises() {
        Shine s = new Shine("<", "", 0, 0, 0, 1, 0, false);
        assertEquals("<#000000>\\<</#000000>", s.render(0));
    }

    @Test
    void couleurs() {
        assertEquals(0xA3121E, Shine.parse("#A3121E"));
        assertEquals(0xA3121E, Shine.parse("A3121E"));
        assertThrows(IllegalArgumentException.class, () -> Shine.parse("#FFF"));
        assertEquals(0x808080, Shine.lerp(0x000000, 0xFFFFFF, 0.5));
        assertEquals(0xA9AEB8, Shine.lerp(0xA9AEB8, 0xFFFFFF, 0));
        assertEquals("#0A0B0C", Shine.hex(0x0A0B0C));
    }
}
