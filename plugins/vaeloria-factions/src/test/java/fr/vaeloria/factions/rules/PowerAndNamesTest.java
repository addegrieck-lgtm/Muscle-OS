package fr.vaeloria.factions.rules;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PowerAndNamesTest {

    @Test
    void landLimitFollowsPower() {
        assertEquals(9, PowerMath.landLimit(9.9, 1.0, 0));
        assertEquals(0, PowerMath.landLimit(-5, 1.0, 0), "power négatif : aucune terre");
        assertEquals(20, PowerMath.landLimit(10, 2.0, 0));
        assertEquals(15, PowerMath.landLimit(40, 1.0, 15), "plafond absolu");
        assertEquals(3, PowerMath.landLimit(0.3 * 10, 1.0, 0), "pas d'erreur d'arrondi flottant");
    }

    @Test
    void vulnerableWhenLandExceedsPower() {
        assertFalse(PowerMath.isVulnerable(10, 10, 1.0));
        assertTrue(PowerMath.isVulnerable(10, 9.5, 1.0));
        assertTrue(PowerMath.isVulnerable(1, -2, 1.0));
    }

    @Test
    void clamp() {
        assertEquals(10, PowerMath.clamp(12, -10, 10));
        assertEquals(-10, PowerMath.clamp(-14, -10, 10));
    }

    @Test
    void names() {
        assertEquals(NameRules.Result.OK, NameRules.validate("Ordre-Noir", 3, 16));
        assertEquals(NameRules.Result.TOO_SHORT, NameRules.validate("ab", 3, 16));
        assertEquals(NameRules.Result.TOO_LONG, NameRules.validate("abcdefghijklmnopq", 3, 16));
        assertEquals(NameRules.Result.TOO_LONG, NameRules.validate("a".repeat(25), 3, 99), "le site plafonne à 24");
        assertEquals(NameRules.Result.INVALID_CHARS, NameRules.validate("Ordre Noir", 3, 16));
        assertEquals(NameRules.Result.INVALID_CHARS, NameRules.validate("<red>X", 3, 16));
        assertEquals(NameRules.Result.RESERVED, NameRules.validate("SafeZone", 3, 16));
    }

    @Test
    void shieldWindow() {
        assertTrue(ShieldWindow.isActive(22, 6, 23 * 60), "22h → 4h, à 23h");
        assertTrue(ShieldWindow.isActive(22, 6, 3 * 60 + 59), "chevauche minuit");
        assertFalse(ShieldWindow.isActive(22, 6, 4 * 60));
        assertFalse(ShieldWindow.isActive(22, 6, 21 * 60 + 59));
        assertTrue(ShieldWindow.isActive(2, 6, 2 * 60));
        assertFalse(ShieldWindow.isActive(2, 6, 8 * 60));
        assertFalse(ShieldWindow.isActive(-1, 6, 600), "pas de bouclier");
        assertEquals("22h → 04h", ShieldWindow.describe(22, 6));
    }
}
