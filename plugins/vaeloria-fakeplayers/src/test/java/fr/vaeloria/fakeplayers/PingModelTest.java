package fr.vaeloria.fakeplayers;

import org.junit.jupiter.api.Test;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class PingModelTest {
    @Test
    void connectionsVaryAndBarsSometimesMove() {
        int good = 0, other = 0;
        for (int i = 0; i < 1000; i++) {
            int base = PingModel.base("joueur" + i);
            assertEquals(base, PingModel.base("JOUEUR" + i)); // stable pour un pseudo
            if (base < 150) good++; else other++;
        }
        assertTrue(good > 800 && other > 40, good + " / " + other);
        Random r = new Random(2);
        int spikes = 0, spike = 0;
        for (int i = 0; i < 2000; i++) {
            int[] n = PingModel.next(40, spike, r);
            spike = n[1];
            assertTrue(n[0] > 0 && n[0] <= 1200);
            if (n[0] >= 150) spikes++; // une barre perdue, visible dans le TAB
        }
        assertTrue(spikes > 40 && spikes < 400, "pics : " + spikes);
    }
}
