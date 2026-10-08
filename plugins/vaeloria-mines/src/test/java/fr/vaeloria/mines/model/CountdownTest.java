package fr.vaeloria.mines.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CountdownTest {
    private static final long[] WARN = {900, 300, 60, 10, 3, 2, 1};

    @Test
    void annonceLeSeuilFranchi() {
        assertEquals(300, Countdown.crossed(WARN, 301, 300));
        assertEquals(-1, Countdown.crossed(WARN, 300, 299));
        // Seconde sautée (tick en retard) : le seuil est quand même annoncé.
        assertEquals(10, Countdown.crossed(WARN, 11, 9));
        assertEquals(1, Countdown.crossed(WARN, 2, 1));
    }

    @Test
    void rienJusteApresUneReinitialisation() {
        // Délai de 15 min : la mine vient de repartir à 900, pas d'annonce « dans 15 minutes » en double.
        assertEquals(-1, Countdown.crossed(WARN, 900, 900));
        assertEquals(-1, Countdown.crossed(WARN, Long.MAX_VALUE, 0));
        assertEquals(-1, Countdown.crossed(WARN, 5, 0));
    }

    @Test
    void premiereVerificationApresDemarrage() {
        // Au démarrage du serveur, previous = MAX : on annonce le seuil courant le plus proche.
        assertEquals(60, Countdown.crossed(WARN, Long.MAX_VALUE, 45));
    }
}
