package fr.vaeloria.fakeplayers.spawn;

import org.bukkit.Material;
import org.bukkit.Sound;

/** Bloc utilisable du spawn (coffre de l'Ender, forge…) et la position où se tenir pour s'en servir. */
record Station(Kind kind, int bx, int by, int bz, double sx, double sy, double sz) {

    /** Types de postes, avec leur poids (fréquence d'utilisation) et leur son. */
    enum Kind {
        ENDER_CHEST(4, null, 60, 240),
        ANVIL(2, Sound.BLOCK_ANVIL_USE, 60, 160),
        SMITHING(1.5, Sound.BLOCK_SMITHING_TABLE_USE, 50, 140),
        GRINDSTONE(1, Sound.BLOCK_GRINDSTONE_USE, 40, 100),
        ENCHANTING(1.5, Sound.BLOCK_ENCHANTMENT_TABLE_USE, 60, 180),
        CRAFTING(1, null, 40, 120),
        FURNACE(0.8, null, 40, 120),
        BREWING(0.6, null, 60, 160);

        final double weight;
        final Sound sound;
        final int minTicks, maxTicks;

        Kind(double weight, Sound sound, int minTicks, int maxTicks) {
            this.weight = weight;
            this.sound = sound;
            this.minTicks = minTicks;
            this.maxTicks = maxTicks;
        }

        static Kind of(Material m) {
            return switch (m) {
                case ENDER_CHEST -> ENDER_CHEST;
                case ANVIL, CHIPPED_ANVIL, DAMAGED_ANVIL -> ANVIL;
                case SMITHING_TABLE -> SMITHING;
                case GRINDSTONE -> GRINDSTONE;
                case ENCHANTING_TABLE -> ENCHANTING;
                case CRAFTING_TABLE -> CRAFTING;
                case FURNACE, BLAST_FURNACE, SMOKER -> FURNACE;
                case BREWING_STAND -> BREWING;
                default -> null;
            };
        }
    }
}
