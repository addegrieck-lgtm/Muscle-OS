package fr.vaeloria.factions.service;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.data.BlockData;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.IntConsumer;
import java.util.zip.GZIPInputStream;

/**
 * Colle un schéma Sponge (.schem v2 ou v3, format de WorldEdit) sans WorldEdit : lecture NBT minimale puis pose par
 * lots, quelques dizaines de milliers de blocs par tick, pour ne pas figer le serveur.
 */
public final class SchematicPaster {
    private SchematicPaster() {}

    /** Schéma chargé : dimensions, palette, blocs (indice = x + z*largeur + y*largeur*longueur), décalage d'origine. */
    public record Schematic(int width, int height, int length, BlockData[] palette, int[] blocks, int offX, int offY, int offZ) {
        public long size() { return (long) width * height * length; }
    }

    // ── NBT ──

    private static Object readPayload(DataInputStream in, int type) throws IOException {
        switch (type) {
            case 1: return in.readByte();
            case 2: return in.readShort();
            case 3: return in.readInt();
            case 4: return in.readLong();
            case 5: return in.readFloat();
            case 6: return in.readDouble();
            case 7: {
                byte[] b = new byte[in.readInt()];
                in.readFully(b);
                return b;
            }
            case 8: {
                byte[] b = new byte[in.readUnsignedShort()];
                in.readFully(b);
                return new String(b, StandardCharsets.UTF_8);
            }
            case 9: {
                int t = in.readByte();
                int n = in.readInt();
                List<Object> l = new ArrayList<>(Math.max(0, n));
                for (int i = 0; i < n; i++) l.add(readPayload(in, t));
                return l;
            }
            case 10: {
                Map<String, Object> m = new HashMap<>();
                while (true) {
                    int t = in.readByte();
                    if (t == 0) return m;
                    byte[] nb = new byte[in.readUnsignedShort()];
                    in.readFully(nb);
                    m.put(new String(nb, StandardCharsets.UTF_8), readPayload(in, t));
                }
            }
            case 11: {
                int[] a = new int[in.readInt()];
                for (int i = 0; i < a.length; i++) a[i] = in.readInt();
                return a;
            }
            case 12: {
                long[] a = new long[in.readInt()];
                for (int i = 0; i < a.length; i++) a[i] = in.readLong();
                return a;
            }
            default: throw new IOException("Type NBT inconnu : " + type);
        }
    }

    /** Schéma brut : palette sous forme de texte (« minecraft:stone_bricks », …), lisible sans serveur. */
    public record Raw(int width, int height, int length, String[] palette, int[] blocks, int offX, int offY, int offZ) {
        public String at(int x, int y, int z) {
            if (x < 0 || y < 0 || z < 0 || x >= width || y >= height || z >= length) return null;
            return palette[blocks[x + z * width + y * width * length]];
        }
    }

    public static Schematic read(InputStream in) throws IOException {
        Raw r = readRaw(in);
        BlockData[] palette = new BlockData[r.palette().length];
        for (int i = 0; i < palette.length; i++) {
            String key = r.palette()[i];
            if (key == null) continue;
            try {
                palette[i] = Bukkit.createBlockData(key);
            } catch (IllegalArgumentException ex) {
                palette[i] = Bukkit.createBlockData(key.replaceAll("\\[.*$", ""));
            }
        }
        return new Schematic(r.width(), r.height(), r.length(), palette, r.blocks(), r.offX(), r.offY(), r.offZ());
    }

    @SuppressWarnings("unchecked")
    public static Raw readRaw(InputStream raw) throws IOException {
        try (DataInputStream in = new DataInputStream(new GZIPInputStream(raw))) {
            if (in.readByte() != 10) throw new IOException("Fichier .schem invalide");
            in.skipBytes(in.readUnsignedShort());
            Map<String, Object> root = (Map<String, Object>) readPayload(in, 10);
            if (root.size() == 1 && root.get("Schematic") instanceof Map<?, ?> inner) root = (Map<String, Object>) inner; // v3
            int w = ((Number) root.get("Width")).shortValue() & 0xFFFF;
            int h = ((Number) root.get("Height")).shortValue() & 0xFFFF;
            int l = ((Number) root.get("Length")).shortValue() & 0xFFFF;
            Map<String, Object> pal;
            byte[] data;
            if (root.get("Blocks") instanceof Map<?, ?> blocks) { // v3
                pal = (Map<String, Object>) blocks.get("Palette");
                data = (byte[]) blocks.get("Data");
            } else {
                pal = (Map<String, Object>) root.get("Palette");
                data = (byte[]) root.get("BlockData");
            }
            if (pal == null || data == null) throw new IOException("Schéma sans blocs");
            int max = 0;
            for (Object v : pal.values()) max = Math.max(max, ((Number) v).intValue());
            String[] palette = new String[max + 1];
            for (var e : pal.entrySet()) palette[((Number) e.getValue()).intValue()] = e.getKey();
            int[] blocks = new int[w * h * l];
            int pos = 0;
            for (int i = 0; i < blocks.length; i++) {
                int value = 0, shift = 0, b;
                do {
                    if (pos >= data.length) throw new IOException("Schéma tronqué");
                    b = data[pos++];
                    value |= (b & 0x7F) << shift;
                    shift += 7;
                } while ((b & 0x80) != 0);
                blocks[i] = value;
            }
            int ox = 0, oy = 0, oz = 0;
            if (root.get("Metadata") instanceof Map<?, ?> meta && meta.get("WEOffsetX") instanceof Number nx) {
                ox = nx.intValue();
                oy = ((Number) meta.get("WEOffsetY")).intValue();
                oz = ((Number) meta.get("WEOffsetZ")).intValue();
            }
            return new Raw(w, h, l, palette, blocks, ox, oy, oz);
        }
    }

    /**
     * Colle le schéma de façon que son origine (le point où l'on se tenait à la copie) tombe sur {@code origin}, comme
     * //paste de WorldEdit. progress reçoit le pourcentage, done est appelé à la fin.
     */
    public static void paste(Plugin plugin, Schematic s, Location origin, int perTick, IntConsumer progress, Consumer<Long> done) {
        World w = origin.getWorld();
        int bx = origin.getBlockX() + s.offX(), by = origin.getBlockY() + s.offY(), bz = origin.getBlockZ() + s.offZ();
        int minY = w.getMinHeight(), maxY = w.getMaxHeight();
        new BukkitRunnable() {
            int i = 0;
            int lastPct = -1;
            long placed = 0;

            @Override
            public void run() {
                int end = Math.min(s.blocks().length, i + perTick);
                int wl = s.width() * s.length();
                for (; i < end; i++) {
                    int y = i / wl, rest = i % wl, z = rest / s.width(), x = rest % s.width();
                    int wy = by + y;
                    if (wy < minY || wy >= maxY) continue;
                    BlockData bd = s.palette()[s.blocks()[i]];
                    if (bd == null) continue;
                    Block b = w.getBlockAt(bx + x, wy, bz + z);
                    if (bd.getMaterial().isAir() && b.getType().isAir()) continue;
                    b.setBlockData(bd, false);
                    placed++;
                }
                int pct = (int) (100L * i / s.blocks().length);
                if (pct / 10 != lastPct / 10) {
                    lastPct = pct;
                    progress.accept(pct);
                }
                if (i >= s.blocks().length) {
                    cancel();
                    done.accept(placed);
                }
            }
        }.runTaskTimer(plugin, 1L, 1L);
    }
}
