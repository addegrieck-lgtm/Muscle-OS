package fr.vaeloria.tab;

import net.kyori.adventure.text.minimessage.MiniMessage;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DensityTest {
    @Test
    void basculeAuDessusDuSeuilAvecHysteresis() {
        assertFalse(Density.compact(false, 40, 40));
        assertTrue(Density.compact(false, 41, 40));
        // Une fois compact, on y reste jusqu'à 5 joueurs sous le seuil.
        assertTrue(Density.compact(true, 38, 40));
        assertTrue(Density.compact(true, 36, 40));
        assertFalse(Density.compact(true, 35, 40));
    }

    @Test
    void desactiveAZero() {
        assertFalse(Density.compact(false, 200, 0));
        assertFalse(Density.compact(true, 200, 0));
    }

    @Test
    void formatCompactPlusEtroit() {
        MiniMessage mm = MiniMessage.miniMessage();
        int full = MotdLayout.width(mm.deserialize("<bold>FONDATEUR</bold> │ Kaelthor"));
        int compact = MotdLayout.width(mm.deserialize("<bold>F</bold> Kaelthor"));
        assertTrue(compact < full / 2, compact + " px contre " + full + " px");
    }
}
