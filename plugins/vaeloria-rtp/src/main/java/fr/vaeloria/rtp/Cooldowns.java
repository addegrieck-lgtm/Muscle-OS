package fr.vaeloria.rtp;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

/** Délais de réutilisation par joueur et par monde (ou un seul délai global si {@code perWorld} est faux). */
public final class Cooldowns {
    private static final String GLOBAL = "*";

    private final Map<UUID, Map<String, Long>> expiries = new ConcurrentHashMap<>();
    private final LongSupplier clock;
    private volatile boolean perWorld;

    public Cooldowns(LongSupplier clockMillis, boolean perWorld) {
        this.clock = clockMillis;
        this.perWorld = perWorld;
    }

    public void perWorld(boolean v) { perWorld = v; }

    /** Secondes restantes avant de pouvoir refaire un RTP (0 si disponible). */
    public long remainingSeconds(UUID player, String world) {
        Map<String, Long> map = expiries.get(player);
        if (map == null) return 0;
        Long until = map.get(key(world));
        if (until == null) return 0;
        long ms = until - clock.getAsLong();
        if (ms <= 0) {
            map.remove(key(world));
            return 0;
        }
        return (ms + 999) / 1000;
    }

    public void start(UUID player, String world, int seconds) {
        if (seconds <= 0) return;
        expiries.computeIfAbsent(player, k -> new ConcurrentHashMap<>())
                .put(key(world), clock.getAsLong() + seconds * 1000L);
    }

    public void reset(UUID player) {
        expiries.remove(player);
    }

    private String key(String world) {
        return perWorld ? world : GLOBAL;
    }

    /** « 1h 05m », « 3m 07s », « 12s ». */
    public static String format(long seconds) {
        if (seconds <= 0) return "0s";
        long h = seconds / 3600;
        long m = (seconds % 3600) / 60;
        long s = seconds % 60;
        if (h > 0) return h + "h " + String.format("%02dm", m);
        if (m > 0) return m + "m " + String.format("%02ds", s);
        return s + "s";
    }
}
