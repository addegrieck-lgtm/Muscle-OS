package fr.vaeloria.villageois.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EmeraldPriceTest {
    @Test
    void jusqua64EnEmeraudes() {
        assertEquals(new EmeraldPrice(1, 0), EmeraldPrice.of(1));
        assertEquals(new EmeraldPrice(64, 0), EmeraldPrice.of(64));
    }

    @Test
    void auDelaEnBlocsArrondisAuBlocSuperieur() {
        assertEquals(new EmeraldPrice(0, 8), EmeraldPrice.of(65)); // 72 payées
        assertEquals(new EmeraldPrice(0, 10), EmeraldPrice.of(90));
        assertEquals(90, EmeraldPrice.of(90).total());
        assertEquals(new EmeraldPrice(0, 64), EmeraldPrice.of(EmeraldPrice.MAX));
    }

    @Test
    void horsLimites() {
        assertThrows(IllegalArgumentException.class, () -> EmeraldPrice.of(0));
        assertThrows(IllegalArgumentException.class, () -> EmeraldPrice.of(EmeraldPrice.MAX + 1));
    }
}
