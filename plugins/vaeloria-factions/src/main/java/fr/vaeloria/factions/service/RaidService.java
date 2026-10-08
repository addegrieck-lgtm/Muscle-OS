package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.rules.ShieldWindow;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

/**
 * Pillage « basique » : TNT, creepers et canons dans les claims ennemis. Gère la période de grâce, le bouclier
 * quotidien, la protection hors-ligne, les alertes aux défenseurs (titre, son, barre de boss), le verrou anti-fuite
 * (pas d'unclaim ni de dissolution sous le feu) et les brèches : un chunk fraîchement explosé laisse ses ennemis
 * ouvrir coffres et portes pendant quelques minutes.
 */
public final class RaidService {
    private final Settings settings;
    private final FactionManager manager;
    private final Store.State state;
    private final Map<ChunkPos, Long> breaches = new HashMap<>();
    private final Map<String, BossBar> bars = new HashMap<>();
    private final Map<String, Set<java.util.UUID>> barViewers = new HashMap<>();

    public RaidService(Settings settings, FactionManager manager, Store.State state) {
        this.settings = settings;
        this.manager = manager;
        this.state = state;
    }

    // ── Règles ──

    public boolean graceActive() { return state.graceUntil > System.currentTimeMillis(); }

    public long graceRemaining() { return Math.max(0, state.graceUntil - System.currentTimeMillis()); }

    public void setGrace(long until) {
        state.graceUntil = until;
        manager.markDirty();
    }

    public int minuteOfDay() {
        ZonedDateTime now = ZonedDateTime.now(settings.zone);
        return now.getHour() * 60 + now.getMinute();
    }

    public boolean shielded(Faction f) {
        return settings.shieldEnabled && f != null && !f.system
                && ShieldWindow.isActive(f.shieldStart, settings.shieldHours, minuteOfDay());
    }

    public boolean offlineProtected(Faction f) {
        return settings.offlineProtection && f != null && !f.system && manager.online(f).isEmpty();
    }

    /** Une explosion peut-elle détruire des blocs sur ce terrain ? owner null = nature. */
    public boolean explosionAllowed(Faction owner) {
        if (owner == null) return settings.explosionsWilderness;
        if (owner.system) return false;
        if (!settings.explosionsInClaims) return false;
        if (graceActive()) return false;
        if (shielded(owner)) return false;
        return !offlineProtected(owner);
    }

    // ── Pillage en cours ──

    /** Appelé pour chaque faction touchée par une explosion autorisée. attacker peut être null (source inconnue). */
    public void onRaidHit(Faction defender, Faction attacker, java.util.Set<ChunkPos> chunks, int blocks) {
        ChunkPos chunk = chunks.iterator().next();
        long now = System.currentTimeMillis();
        defender.raidUntil = now + settings.raidLockMinutes * 60_000L;
        defender.lastRaidChunk = chunk;
        boolean hostile = attacker != null && !attacker.id.equals(defender.id);
        if (hostile) {
            attacker.blocksDestroyed += blocks;
            if (defender.raidAttackers.add(attacker.id)) {
                attacker.raidsDone++;
                defender.raidsSuffered++;
                var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
                if (plugin != null) {
                    plugin.wars().onRaid(attacker, defender);
                    plugin.logs().add(defender, "PILLAGE", attacker.name, "pillage en " + (chunk.x() * 16 + 8) + ", " + (chunk.z() * 16 + 8));
                    plugin.logs().add(attacker, "PILLAGE", attacker.name, "pillage de " + defender.name);
                }
                if (settings.raidBroadcast) {
                    Bukkit.broadcast(Msg.prefixed("raid.broadcast", "attacker", attacker.name, "defender", defender.name));
                }
            }
            if (settings.breachEnabled && manager.relation(attacker, defender) == Relation.ENNEMI) {
                for (ChunkPos c : chunks) breaches.put(c, now + settings.breachMinutes * 60_000L);
            }
            manager.markDirty();
        }
        if (now - defender.lastRaidAlert >= settings.raidAlertCooldown * 1000L) {
            defender.lastRaidAlert = now;
            var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
            if (plugin != null) plugin.discord().raid(defender, attacker == null ? "Inconnu" : attacker.name, chunk.x() * 16 + 8, chunk.z() * 16 + 8);
            Title title = Title.title(Msg.get("raid.alert-title"),
                    Msg.get("raid.alert-subtitle", "x", chunk.x() * 16 + 8, "z", chunk.z() * 16 + 8,
                            "attacker", attacker == null ? "inconnu" : attacker.name),
                    Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
            for (Player p : manager.online(defender)) {
                p.showTitle(title);
                p.playSound(p.getLocation(), Sound.EVENT_RAID_HORN, 1f, 1f);
                Msg.send(p, "raid.alert-chat", "x", chunk.x() * 16 + 8, "z", chunk.z() * 16 + 8,
                        "attacker", attacker == null ? "inconnu" : attacker.name);
            }
        }
    }

    /** Un ennemi peut-il piller (coffres / portes) ce chunk fraîchement ouvert ? */
    public boolean breached(ChunkPos pos, Faction owner, Faction actor) {
        if (!settings.breachEnabled || owner == null || owner.system || actor == null) return false;
        Long until = breaches.get(pos);
        return until != null && until > System.currentTimeMillis() && manager.relation(actor, owner) == Relation.ENNEMI;
    }

    public long breachRemaining(ChunkPos pos) {
        Long until = breaches.get(pos);
        return until == null ? 0 : Math.max(0, until - System.currentTimeMillis());
    }

    /** Chaque seconde : barres de boss des défenseurs, fin des raids et des brèches. */
    public void tick() {
        long now = System.currentTimeMillis();
        breaches.values().removeIf(t -> t <= now);
        for (Faction f : manager.playerFactions()) {
            if (f.raidUntil == 0) continue;
            if (f.raidUntil <= now) {
                f.raidUntil = 0;
                f.raidAttackers.clear();
                hideBar(f.id);
                for (Player p : manager.online(f)) Msg.send(p, "raid.ended");
                continue;
            }
            if (!settings.raidBossbar) continue;
            float progress = (float) Math.max(0, Math.min(1, (f.raidUntil - now) / (settings.raidLockMinutes * 60_000.0)));
            BossBar bar = bars.computeIfAbsent(f.id, k -> BossBar.bossBar(net.kyori.adventure.text.Component.empty(), 1f,
                    BossBar.Color.RED, BossBar.Overlay.NOTCHED_10));
            ChunkPos c = f.lastRaidChunk;
            bar.name(Msg.get("raid.bossbar", "time", Msg.duration(f.raidUntil - now),
                    "x", c == null ? "?" : String.valueOf(c.x() * 16 + 8), "z", c == null ? "?" : String.valueOf(c.z() * 16 + 8)));
            bar.progress(progress);
            Set<java.util.UUID> viewers = barViewers.computeIfAbsent(f.id, k -> new HashSet<>());
            Set<java.util.UUID> current = new HashSet<>();
            for (Player p : manager.online(f)) {
                current.add(p.getUniqueId());
                if (viewers.add(p.getUniqueId())) p.showBossBar(bar);
            }
            for (Iterator<java.util.UUID> it = viewers.iterator(); it.hasNext(); ) {
                java.util.UUID u = it.next();
                if (!current.contains(u)) {
                    Player p = Bukkit.getPlayer(u);
                    if (p != null) p.hideBossBar(bar);
                    it.remove();
                }
            }
        }
    }

    public void hideBar(String factionId) {
        BossBar bar = bars.remove(factionId);
        Set<java.util.UUID> viewers = barViewers.remove(factionId);
        if (bar == null || viewers == null) return;
        for (java.util.UUID u : viewers) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) p.hideBossBar(bar);
        }
    }

    public void hideAll() {
        for (String id : new HashSet<>(bars.keySet())) hideBar(id);
    }
}
