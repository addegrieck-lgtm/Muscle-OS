package fr.vaeloria.combat;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KnockbackTest {
    private static final Knockback.Settings S = Knockback.Settings.VANILLA_1_8;
    private static final Knockback.Vec STILL = new Knockback.Vec(0, 0, 0);

    @Test
    void reculDeBase1_8() {
        // Victime 3 blocs à l'est (+X) de l'attaquant, immobile, coup sans sprint.
        Knockback.Vec v = Knockback.compute(S, STILL, 3, 0, 0f, 0, 0);
        assertEquals(0.4, v.x(), 1e-9);
        assertEquals(0.4, v.y(), 1e-9);
        assertEquals(0.0, v.z(), 1e-9);
    }

    @Test
    void laVitesseActuelleEstDiviseeParLaFriction() {
        Knockback.Vec v = Knockback.compute(S, new Knockback.Vec(0.2, -0.0784, 0.1), 0, 2, 0f, 0, 0);
        assertEquals(0.1, v.x(), 1e-9);
        assertEquals(-0.0392 + 0.4, v.y(), 1e-9);
        assertEquals(0.05 + 0.4, v.z(), 1e-9);
    }

    @Test
    void leReculVerticalEstPlafonne() {
        Knockback.Vec v = Knockback.compute(S, new Knockback.Vec(0, 0.5, 0), 1, 0, 0f, 0, 0);
        assertEquals(0.4, v.y(), 1e-9);
    }

    @Test
    void sprintAjouteLeBonusDansLaDirectionDuRegard() {
        // Yaw 0 = regard vers +Z en Minecraft.
        Knockback.Vec v = Knockback.compute(S, STILL, 0, 1, 0f, 1, 0);
        assertEquals(0.0, v.x(), 1e-9);
        assertEquals(0.4 + 0.1, v.y(), 1e-9);
        assertEquals(0.4 + 0.5, v.z(), 1e-9);
    }

    @Test
    void leBonusEstProportionnelAuNiveau() {
        Knockback.Vec sprintRecul2 = Knockback.compute(S, STILL, 0, 1, 0f, 3, 0);
        assertEquals(0.4 + 1.5, sprintRecul2.z(), 1e-9);
    }

    @Test
    void joueursSuperposesPousseDansLeRegardDeLAttaquant() {
        Knockback.Vec v = Knockback.compute(S, STILL, 0, 0, 90f, 0, 0); // yaw 90 = regard vers -X
        assertEquals(-0.4, v.x(), 1e-9);
        assertEquals(0.0, v.z(), 1e-9);
    }

    @Test
    void resistanceIgnoreeParDefautMaisAppliquableSurDemande() {
        assertEquals(0.4, Knockback.compute(S, STILL, 1, 0, 0f, 0, 0.3).x(), 1e-9);
        Knockback.Settings withRes = new Knockback.Settings(2, 0.4, 0.4, 0.4, 0.5, 0.1, false);
        assertEquals(0.28, Knockback.compute(withRes, STILL, 1, 0, 0f, 0, 0.3).x(), 1e-9);
    }

    @Test
    void memeCoupMemeReculPourTous() {
        Knockback.Vec a = Knockback.compute(S, STILL, 2.5, -1.2, 37f, 1, 0);
        Knockback.Vec b = Knockback.compute(S, STILL, 2.5, -1.2, 37f, 1, 0);
        assertEquals(a, b);
    }

    @Test
    void attaquantFaceALaVictimeEnSprint() {
        // Victime au nord-ouest, attaquant qui la regarde : recul horizontal = 0.4 + 0.5.
        double dx = -1, dz = 1;
        float yaw = (float) Math.toDegrees(Math.atan2(-dx, dz));
        Knockback.Vec v = Knockback.compute(S, STILL, dx, dz, yaw, 1, 0);
        assertEquals(0.9, Math.hypot(v.x(), v.z()), 1e-9);
        assertTrue(v.x() < 0 && v.z() > 0);
    }
}
