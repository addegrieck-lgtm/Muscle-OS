package fr.vaeloria.jobs.model;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EffectTest {
    @Test
    void keysAreNormalisedToVanillaNames() {
        assertEquals("armor", Effect.attribute("minecraft:generic.armor", 1, null).key());
        assertEquals("fire_resistance", Effect.potion("FIRE_RESISTANCE", 1).key());
    }

    @Test
    void operationsAcceptVanillaAndBukkitNames() {
        assertEquals(Effect.Operation.MULTIPLY_BASE, Effect.Operation.parse("add_multiplied_base"));
        assertEquals(Effect.Operation.MULTIPLY_TOTAL, Effect.Operation.parse("add_multiplied_total"));
        assertEquals(Effect.Operation.ADD, Effect.Operation.parse(null));
        assertThrows(IllegalArgumentException.class, () -> Effect.Operation.parse("boost"));
    }

    @Test
    void descriptionsAreReadable() {
        assertEquals("+1 Armure", Effect.attribute("armor", 1, Effect.Operation.ADD).describe());
        assertEquals("+0,5 Robustesse d'armure", Effect.attribute("armor_toughness", 0.5, Effect.Operation.ADD).describe());
        assertEquals("-15 % Durée de combustion", Effect.attribute("burning_time", -0.15, Effect.Operation.MULTIPLY_BASE).describe());
        assertEquals("+1 cœur de vie maximale", Effect.attribute("max_health", 2, Effect.Operation.ADD).describe());
        assertEquals("+15 % Résistance au souffle des explosions", Effect.attribute("explosion_knockback_resistance", 0.15, Effect.Operation.ADD).describe());
        assertEquals("Résistance au feu I (permanent)", Effect.potion("fire_resistance", 1).describe());
    }

    @Test
    void potionLevelMustBeValid() {
        assertThrows(IllegalArgumentException.class, () -> Effect.potion("speed", 0));
        assertEquals(1, Effect.potion("speed", 2).amplifier());
    }
}
