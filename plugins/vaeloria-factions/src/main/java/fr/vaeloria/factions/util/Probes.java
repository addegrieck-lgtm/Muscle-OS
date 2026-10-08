package fr.vaeloria.factions.util;

import org.bukkit.event.block.BlockBreakEvent;

/**
 * Les outils de VæloriaShop (et d'autres plugins) testent les protections en lançant une fausse casse : une sous-classe
 * de BlockBreakEvent. Les protections doivent y répondre, mais aucun effet de bord (drop, mission, éclat…) ne doit
 * s'y produire, sinon on duplique des objets.
 */
public final class Probes {
    private Probes() {}

    public static boolean isProbe(BlockBreakEvent e) {
        return e.getClass() != BlockBreakEvent.class;
    }
}
