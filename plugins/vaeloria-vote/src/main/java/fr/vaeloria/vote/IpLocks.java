package fr.vaeloria.vote;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

/**
 * Les API de vote vérifient le plus souvent par IP : sans ce verrou, un vote fait depuis une box
 * pourrait être réclamé par chaque compte du foyer. Un vote par site, par IP et par délai du site.
 * Les IP sont conservées hachées.
 */
public final class IpLocks {
    record Lock(UUID owner, long until) {}

    final Map<String, Lock> locks = new HashMap<>();

    /** @return true si ce joueur peut utiliser le vote de cette IP (et le verrouille à son nom). */
    public boolean tryLock(String siteId, String ipHash, UUID player, long now, long durationMillis) {
        String key = siteId + "|" + ipHash;
        Lock lock = locks.get(key);
        if (lock != null && lock.until() > now && !lock.owner().equals(player)) return false;
        locks.put(key, new Lock(player, now + durationMillis));
        return true;
    }

    public void prune(long now) {
        locks.values().removeIf(l -> l.until() <= now);
    }

    public static String hash(String ip) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(("vaeloria-vote:" + ip).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(d, 0, 16);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
