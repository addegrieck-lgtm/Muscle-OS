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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
        fr.vaeloria.factions.model.RaidReport report = report(defender, now);
        report.touch(attacker == null ? null : attacker.name, now);
        report.addBlocks(attacker == null ? null : attacker.name, blocks);
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

    // ── Bilan de pillage ──

    private fr.vaeloria.factions.model.RaidReport report(Faction defender, long now) {
        if (defender.raidReport == null) defender.raidReport = new fr.vaeloria.factions.model.RaidReport(now);
        return defender.raidReport;
    }

    /** Surclaim subi : compte dans le bilan et ouvre (ou prolonge) la période de raid. */
    public void onOverclaimed(Faction defender, Faction attacker, ChunkPos chunk) {
        long now = System.currentTimeMillis();
        fr.vaeloria.factions.model.RaidReport r = report(defender, now);
        r.touch(attacker.name, now);
        r.chunksLost++;
        defender.raidUntil = Math.max(defender.raidUntil, now + settings.raidLockMinutes * 60_000L);
        defender.lastRaidChunk = chunk;
    }

    /** Mort pendant un raid : membre du défenseur tué par un attaquant, ou attaquant abattu par la défense. */
    public void onKill(Faction killer, Faction victim) {
        if (killer == null || victim == null || killer == victim) return;
        long now = System.currentTimeMillis();
        if (victim.inRaid() && victim.raidReport != null && victim.raidReport.attackers.contains(killer.name)) {
            victim.raidReport.membersKilled++;
            victim.raidReport.touch(null, now);
        }
        if (killer.inRaid() && killer.raidReport != null && killer.raidReport.attackers.contains(victim.name)) {
            killer.raidReport.enemiesKilled++;
            killer.raidReport.touch(null, now);
        }
    }

    /** Coffres pillés par la brèche : contenu résumé à l'ouverture, comparé à la fermeture. */
    private record Loot(String ownerId, String attacker, java.util.Map<String, Integer> before) {}

    private final Map<java.util.UUID, String> pendingBreachOpen = new HashMap<>();
    private final Map<java.util.UUID, Loot> loot = new HashMap<>();

    /** Un ennemi ouvre un conteneur grâce à une brèche ; l'inventaire s'ouvrira juste après. */
    public void breachOpening(Player p, Faction owner) {
        pendingBreachOpen.put(p.getUniqueId(), owner.id);
    }

    public void inventoryOpened(Player p, org.bukkit.inventory.Inventory inv) {
        String ownerId = pendingBreachOpen.remove(p.getUniqueId());
        if (ownerId == null) return;
        Faction owner = manager.byId(ownerId);
        Faction mine = manager.factionOf(p);
        if (owner == null || mine == null) return;
        long now = System.currentTimeMillis();
        fr.vaeloria.factions.model.RaidReport r = report(owner, now);
        r.containersOpened++;
        r.touch(mine.name, now);
        loot.put(p.getUniqueId(), new Loot(ownerId, mine.name, LogService.summarize(inv)));
    }

    public void inventoryClosed(Player p, org.bukkit.inventory.Inventory inv) {
        Loot l = loot.remove(p.getUniqueId());
        if (l == null) return;
        Faction owner = manager.byId(l.ownerId());
        if (owner == null) return;
        Map<String, Integer> taken = new java.util.LinkedHashMap<>();
        fr.vaeloria.factions.rules.ItemDiff.diff(l.before(), LogService.summarize(inv)).forEach((k, v) -> {
            if (v < 0) taken.put(k, -v);
        });
        if (taken.isEmpty()) return;
        report(owner, System.currentTimeMillis()).addStolen(l.attacker(), taken);
        var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
        if (plugin != null) {
            plugin.logs().add(owner, "VOL", p.getName() + " (" + l.attacker() + ")",
                    "a volé " + String.join(", ", fr.vaeloria.factions.model.RaidReport.top(taken, 6)));
        }
    }

    public void forgetPlayer(java.util.UUID uuid) {
        pendingBreachOpen.remove(uuid);
        loot.remove(uuid);
    }

    private void sendReport(Faction f, fr.vaeloria.factions.model.RaidReport r) {
        long duration = Math.max(0, r.lastActivity - r.startedAt);
        String attackers = r.attackers.isEmpty() ? "inconnus" : String.join(", ", r.attackers);
        List<String> detail = new ArrayList<>();
        r.blocksByAttacker.forEach((k, v) -> detail.add(k + " " + v));
        if (r.blocksUnknown > 0) detail.add("inconnu " + r.blocksUnknown);
        String stolen = r.stolen.isEmpty() ? "" : String.join(", ", fr.vaeloria.factions.model.RaidReport.top(r.stolen, 6));
        for (Player p : manager.online(f)) {
            p.sendMessage(Msg.get("raid.report.header"));
            p.sendMessage(Msg.get("raid.report.attackers", "attackers", attackers, "duration", Msg.duration(duration)));
            p.sendMessage(Msg.get("raid.report.blocks", "total", r.totalBlocks(), "detail", detail.isEmpty() ? "—" : String.join(", ", detail)));
            if (r.containersOpened > 0 || !r.stolen.isEmpty()) {
                p.sendMessage(Msg.get("raid.report.containers", "count", r.containersOpened));
                if (!stolen.isEmpty()) p.sendMessage(Msg.get("raid.report.stolen", "items", stolen));
            }
            if (r.chunksLost > 0) p.sendMessage(Msg.get("raid.report.chunks", "count", r.chunksLost));
            p.sendMessage(Msg.get("raid.report.kills", "dead", r.membersKilled, "killed", r.enemiesKilled));
            p.playSound(p.getLocation(), Sound.ITEM_BOOK_PAGE_TURN, 1f, 0.9f);
        }
        String summary = r.totalBlocks() + " blocs détruits, " + r.containersOpened + " coffre(s) ouvert(s), "
                + r.totalStolen() + " objet(s) volé(s), " + r.chunksLost + " chunk(s) perdu(s), "
                + r.membersKilled + " membre(s) tué(s), " + r.enemiesKilled + " ennemi(s) abattu(s)";
        var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
        if (plugin != null) {
            plugin.logs().add(f, "BILAN", attackers, summary + " — durée " + Msg.duration(duration));
            plugin.discord().raidReport(f, attackers, Msg.duration(duration), summary, stolen);
        }
        // Les attaquants reçoivent leur part.
        for (String name : r.attackers) {
            Faction a = manager.byName(name);
            if (a == null) continue;
            int blocks = r.blocksByAttacker.getOrDefault(name, 0);
            Map<String, Integer> mine = r.stolenByAttacker.getOrDefault(name, Map.of());
            int items = 0;
            for (int v : mine.values()) items += v;
            for (Player p : manager.online(a)) {
                Msg.send(p, "raid.report.attacker-summary", "defender", f.name, "blocks", blocks, "items", items,
                        "loot", mine.isEmpty() ? "—" : String.join(", ", fr.vaeloria.factions.model.RaidReport.top(mine, 4)));
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
                fr.vaeloria.factions.model.RaidReport report = f.raidReport;
                f.raidReport = null;
                if (report == null || report.isEmpty()) {
                    for (Player p : manager.online(f)) Msg.send(p, "raid.ended");
                } else {
                    sendReport(f, report);
                }
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
