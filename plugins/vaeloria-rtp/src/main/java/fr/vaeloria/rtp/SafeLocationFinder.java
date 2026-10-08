package fr.vaeloria.rtp;

import org.bukkit.HeightMap;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Biome;
import org.bukkit.block.Block;

import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Cherche une position sûre : sol solide, deux blocs d'air au-dessus, pas de lave/eau/cactus,
 * biome autorisé, dans la bordure du monde. Les chunks sont chargés en asynchrone (Paper),
 * les vérifications de blocs ont lieu sur le thread principal.
 */
public final class SafeLocationFinder {
    private final VaeloriaRtpPlugin plugin;
    private Set<Material> unsafe = Set.of();
    private Set<String> blockedBiomes = Set.of();
    private int maxAttempts = 25;

    public SafeLocationFinder(VaeloriaRtpPlugin plugin) {
        this.plugin = plugin;
    }

    public void reload() {
        var cfg = plugin.getConfig();
        maxAttempts = Math.max(1, cfg.getInt("search.max-attempts", 25));
        unsafe = cfg.getStringList("search.unsafe-blocks").stream()
                .map(n -> Material.matchMaterial(n))
                .filter(m -> m != null)
                .collect(Collectors.toUnmodifiableSet());
        blockedBiomes = cfg.getStringList("search.blocked-biomes").stream()
                .map(b -> b.toLowerCase(Locale.ROOT).replace("minecraft:", ""))
                .collect(Collectors.toUnmodifiableSet());
    }

    /** Complète avec null si aucune position sûre n'a été trouvée après max-attempts essais. */
    public CompletableFuture<Location> find(World world, RtpWorld settings) {
        CompletableFuture<Location> result = new CompletableFuture<>();
        attempt(world, settings, maxAttempts, result);
        return result;
    }

    private void attempt(World world, RtpWorld s, int left, CompletableFuture<Location> result) {
        if (left <= 0 || !plugin.isEnabled()) {
            result.complete(null);
            return;
        }
        int[] p = preselect(world, s);
        if (p == null) {
            result.complete(null);
            return;
        }
        int x = p[0];
        int z = p[1];
        world.getChunkAtAsync(x >> 4, z >> 4, true).whenComplete((chunk, error) -> {
            if (error != null) {
                result.completeExceptionally(error);
                return;
            }
            Location found;
            try {
                found = check(world, s, x, z);
            } catch (RuntimeException e) {
                result.completeExceptionally(e);
                return;
            }
            if (found != null) result.complete(found);
            else attempt(world, s, left - 1, result);
        });
    }

    /**
     * Tire des points jusqu'à en trouver un dans la bordure et hors biome interdit, sans charger de chunk :
     * le biome est calculé par le générateur (getComputedBiome). Évite de générer des chunks d'océan pour rien.
     */
    private int[] preselect(World world, RtpWorld s) {
        ThreadLocalRandom rng = ThreadLocalRandom.current();
        int y = world.hasCeiling() ? 64 : world.getSeaLevel();
        for (int i = 0; i < 64; i++) {
            int[] p = CoordinatePicker.pick(s.shape(), s.centerX(), s.centerZ(), s.minRadius(), s.maxRadius(), rng);
            if (!world.getWorldBorder().isInside(new Location(world, p[0] + 0.5, 0, p[1] + 0.5))) continue;
            if (!blockedBiomes.isEmpty() && blockedBiomes.contains(biomeKey(world.getComputedBiome(p[0], y, p[1])))) continue;
            return p;
        }
        return null;
    }

    private Location check(World world, RtpWorld s, int x, int z) {
        int minY = world.getMinHeight();
        int groundY;
        if (world.hasCeiling() || s.maxY() != null) {
            // Nether (ou plafond imposé) : on descend depuis max-y jusqu'à une poche d'air sur sol solide.
            int top = Math.min(s.maxY() != null ? s.maxY() : 120, world.getMaxHeight() - 3);
            groundY = Integer.MIN_VALUE;
            for (int y = top; y > minY; y--) {
                if (isSafe(world, x, y, z)) {
                    groundY = y;
                    break;
                }
            }
            if (groundY == Integer.MIN_VALUE) return null;
        } else {
            groundY = world.getHighestBlockYAt(x, z, HeightMap.MOTION_BLOCKING_NO_LEAVES);
            if (groundY <= minY || !isSafe(world, x, groundY, z)) return null;
        }
        Block ground = world.getBlockAt(x, groundY, z);
        if (!blockedBiomes.isEmpty() && blockedBiomes.contains(biomeKey(ground.getBiome()))) return null;
        return new Location(world, x + 0.5, groundY + 1, z + 0.5);
    }

    private boolean isSafe(World world, int x, int y, int z) {
        Block ground = world.getBlockAt(x, y, z);
        Material g = ground.getType();
        if (!g.isSolid() || unsafe.contains(g)) return false;
        Block feet = ground.getRelative(0, 1, 0);
        Block head = ground.getRelative(0, 2, 0);
        return isFree(feet) && isFree(head) && noLavaAround(ground);
    }

    /** Pas de lave ni de feu sur les 8 cases autour, au niveau du sol et des pieds (fréquent dans le Nether). */
    private static boolean noLavaAround(Block ground) {
        for (int dx = -1; dx <= 1; dx++) {
            for (int dz = -1; dz <= 1; dz++) {
                if (dx == 0 && dz == 0) continue;
                for (int dy = 0; dy <= 1; dy++) {
                    Material m = ground.getRelative(dx, dy, dz).getType();
                    if (m == Material.LAVA || m == Material.FIRE || m == Material.SOUL_FIRE) return false;
                }
            }
        }
        return true;
    }

    private boolean isFree(Block b) {
        return b.isPassable() && !b.isLiquid() && !unsafe.contains(b.getType());
    }

    @SuppressWarnings("deprecation")
    private static String biomeKey(Biome biome) {
        return biome.getKey().getKey().toLowerCase(Locale.ROOT);
    }
}
