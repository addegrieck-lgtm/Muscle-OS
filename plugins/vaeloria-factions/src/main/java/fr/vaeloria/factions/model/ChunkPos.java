package fr.vaeloria.factions.model;

import org.bukkit.Chunk;
import org.bukkit.Location;

/** Coordonnées d'un chunk, clé de la carte des claims. */
public record ChunkPos(String world, int x, int z) {

    public static ChunkPos of(Location l) {
        return new ChunkPos(l.getWorld().getName(), l.getBlockX() >> 4, l.getBlockZ() >> 4);
    }

    public static ChunkPos of(Chunk c) {
        return new ChunkPos(c.getWorld().getName(), c.getX(), c.getZ());
    }

    public ChunkPos offset(int dx, int dz) {
        return new ChunkPos(world, x + dx, z + dz);
    }

    public ChunkPos[] neighbours() {
        return new ChunkPos[]{offset(1, 0), offset(-1, 0), offset(0, 1), offset(0, -1)};
    }

    public String key() {
        return world + ";" + x + ";" + z;
    }

    public static ChunkPos parse(String key) {
        int b = key.lastIndexOf(';');
        int a = key.lastIndexOf(';', b - 1);
        return new ChunkPos(key.substring(0, a), Integer.parseInt(key.substring(a + 1, b)), Integer.parseInt(key.substring(b + 1)));
    }
}
