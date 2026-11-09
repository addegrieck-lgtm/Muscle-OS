package fr.vaeloria.jobs;

import org.bukkit.Chunk;
import org.bukkit.NamespacedKey;
import org.bukkit.block.Block;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;

import java.util.Arrays;

/**
 * Blocs posés par un joueur (ou formés par lave + eau, ou déplacés par un piston), enregistrés dans les
 * données persistantes du chunk : ils survivent aux redémarrages et disparaissent avec le chunk.
 * Seuls les matériaux qui rapportent de l'XP à la casse sont suivis.
 */
final class PlacedBlocks {
    private final NamespacedKey key;

    PlacedBlocks(Plugin plugin) {
        this.key = new NamespacedKey(plugin, "placed");
    }

    /** Position dans le chunk : x (4 bits) | z (4 bits) | y + 2048 (12 bits). */
    static int pack(int x, int y, int z) {
        return (x & 15) | ((z & 15) << 4) | (((y + 2048) & 0xFFF) << 8);
    }

    boolean isPlaced(Block b) {
        int[] arr = b.getChunk().getPersistentDataContainer().get(key, PersistentDataType.INTEGER_ARRAY);
        if (arr == null) return false;
        int p = pack(b.getX(), b.getY(), b.getZ());
        for (int v : arr) if (v == p) return true;
        return false;
    }

    void mark(Block b) {
        Chunk c = b.getChunk();
        PersistentDataContainer pdc = c.getPersistentDataContainer();
        int[] arr = pdc.get(key, PersistentDataType.INTEGER_ARRAY);
        int p = pack(b.getX(), b.getY(), b.getZ());
        if (arr == null) {
            pdc.set(key, PersistentDataType.INTEGER_ARRAY, new int[] {p});
            return;
        }
        for (int v : arr) if (v == p) return;
        int[] next = Arrays.copyOf(arr, arr.length + 1);
        next[arr.length] = p;
        pdc.set(key, PersistentDataType.INTEGER_ARRAY, next);
    }

    void unmark(Block b) {
        PersistentDataContainer pdc = b.getChunk().getPersistentDataContainer();
        int[] arr = pdc.get(key, PersistentDataType.INTEGER_ARRAY);
        if (arr == null) return;
        int p = pack(b.getX(), b.getY(), b.getZ());
        int idx = -1;
        for (int i = 0; i < arr.length; i++) if (arr[i] == p) { idx = i; break; }
        if (idx < 0) return;
        if (arr.length == 1) {
            pdc.remove(key);
            return;
        }
        int[] next = new int[arr.length - 1];
        System.arraycopy(arr, 0, next, 0, idx);
        System.arraycopy(arr, idx + 1, next, idx, arr.length - idx - 1);
        pdc.set(key, PersistentDataType.INTEGER_ARRAY, next);
    }
}
