package fr.vaeloria.fakeplayers.spawn;

import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.util.BoundingBox;

/** Terrain réel : blocs du monde (thread principal uniquement). */
final class BukkitTerrain implements Terrain {
    private final World world;

    BukkitTerrain(World world) {
        this.world = world;
    }

    @Override
    public double feet(int x, double fromY, int z) {
        if (!world.isChunkLoaded(x >> 4, z >> 4)) return Double.NaN;
        int top = (int) Math.floor(fromY + 1.0 + 1e-6);
        for (int by = top; by >= Math.floor(fromY) - 3; by--) {
            if (by < world.getMinHeight()) return Double.NaN;
            Block b = world.getBlockAt(x, by, z);
            if (b.isLiquid()) return Double.NaN;
            if (b.isPassable()) continue;
            BoundingBox box = b.getBoundingBox();
            // Bloc fin (barreaux, lanterne, trappe ouverte, poteau) : c'est un obstacle, pas un sol.
            if (box.getWidthX() < 0.9 || box.getWidthZ() < 0.9) return Double.NaN;
            double surface = box.getMaxY();
            if (surface - fromY > 1.01) return Double.NaN; // mur, clôture (1,5)
            return clear(x, surface, z) ? surface : Double.NaN;
        }
        return Double.NaN; // trou de plus de 3 blocs ou vide
    }

    /**
     * Deux blocs libres (ni solides ni liquides) au-dessus du bloc qui porte la surface : un tapis ou une dalle
     * occupe le bas de son propre bloc, la tête est dans les deux blocs suivants.
     */
    private boolean clear(int x, double surface, int z) {
        int first = (int) Math.floor(surface - 1e-6) + 1;
        for (int y = first; y <= first + 1; y++) {
            Block b = world.getBlockAt(x, y, z);
            if (b.isLiquid() || !b.isPassable()) return false;
        }
        return true;
    }
}
