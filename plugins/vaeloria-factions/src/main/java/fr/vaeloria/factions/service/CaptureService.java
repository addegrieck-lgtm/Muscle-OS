package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Zone;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Zones de capture.
 * <ul>
 *   <li><b>Avant-postes</b> (permanents) : une faction seule dans la zone pendant capture-seconds le prend ; elle touche
 *   un revenu en banque régulier et un bonus de power tant qu'elle le tient.</li>
 *   <li><b>KOTH</b> (événement) : la faction qui tient la zone seule, sans interruption, pendant hold-seconds gagne.</li>
 * </ul>
 * Zone disputée (plusieurs factions dedans) : la capture se fige.
 */
public final class CaptureService {
    private final VaeloriaFactionsPlugin plugin;
    private final Settings settings;
    private final Store.State state;

    /** Capture en cours par zone : faction qui capture et secondes accumulées. */
    private final Map<String, String> capturer = new HashMap<>();
    private final Map<String, Integer> progress = new HashMap<>();
    private final Map<String, BossBar> bars = new HashMap<>();
    private final Map<String, Set<UUID>> barViewers = new HashMap<>();

    private Zone koth;
    private long kothEndsAt;
    private String lastScheduleKey;

    public CaptureService(VaeloriaFactionsPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
    }

    // ── Définitions ──

    public List<Zone> zones(Zone.Kind kind) {
        List<Zone> l = new ArrayList<>();
        for (Zone z : state.zones.values()) if (z.kind == kind) l.add(z);
        return l;
    }

    public Zone get(String name, Zone.Kind kind) {
        Zone z = name == null ? null : state.zones.get(key(name, kind));
        return z != null && z.kind == kind ? z : null;
    }

    private static String key(String name, Zone.Kind kind) {
        return kind.name().toLowerCase(Locale.ROOT) + ":" + name.toLowerCase(Locale.ROOT);
    }

    public boolean create(String name, Zone.Kind kind, Location l, int radius) {
        String k = key(name, kind);
        if (state.zones.containsKey(k)) return false;
        state.zones.put(k, new Zone(name, kind, l, Math.max(2, Math.min(30, radius))));
        plugin.manager().markDirty();
        return true;
    }

    public boolean delete(String name, Zone.Kind kind) {
        Zone z = get(name, kind);
        if (z == null) return false;
        if (z == koth) stopKoth(false);
        state.zones.remove(key(name, kind));
        reset(z);
        hideBar(z);
        plugin.manager().markDirty();
        return true;
    }

    /** Nombre d'avant-postes tenus par une faction (bonus de power). */
    public int heldBy(Faction f) {
        int n = 0;
        for (Zone z : state.zones.values()) if (z.kind == Zone.Kind.OUTPOST && f.id.equals(z.holder)) n++;
        return n;
    }

    public double outpostPower(Faction f) {
        return settings.outpostsEnabled ? heldBy(f) * settings.outpostPower : 0;
    }

    /** Une faction dissoute libère ses avant-postes. */
    public void onDisband(Faction f) {
        for (Zone z : state.zones.values()) if (f.id.equals(z.holder)) z.holder = null;
        if (koth != null && f.id.equals(capturer.get(zoneKey(koth)))) reset(koth);
    }

    private static String zoneKey(Zone z) { return key(z.name, z.kind); }

    private void reset(Zone z) {
        capturer.remove(zoneKey(z));
        progress.remove(zoneKey(z));
    }

    // ── KOTH ──

    public enum StartResult { OK, DISABLED, ALREADY_RUNNING, UNKNOWN, NONE_DEFINED, WORLD_MISSING, NOT_ENOUGH_PLAYERS }

    public Zone activeKoth() { return koth; }

    public StartResult startKoth(String name, int minutes, boolean scheduled) {
        if (!settings.kothEnabled) return StartResult.DISABLED;
        if (koth != null) return StartResult.ALREADY_RUNNING;
        Zone z;
        if (name == null) {
            List<Zone> all = zones(Zone.Kind.KOTH);
            if (all.isEmpty()) return StartResult.NONE_DEFINED;
            z = all.get(ThreadLocalRandom.current().nextInt(all.size()));
        } else {
            z = get(name, Zone.Kind.KOTH);
            if (z == null) return StartResult.UNKNOWN;
        }
        if (Bukkit.getWorld(z.world) == null) return StartResult.WORLD_MISSING;
        if (scheduled && Bukkit.getOnlinePlayers().size() < settings.kothMinOnline) return StartResult.NOT_ENOUGH_PLAYERS;
        int duration = minutes > 0 ? minutes : settings.kothDurationMinutes;
        koth = z;
        kothEndsAt = System.currentTimeMillis() + duration * 60_000L;
        reset(z);
        Bukkit.broadcast(Msg.prefixed("koth.started", "koth", z.name, "x", z.x, "z", z.z,
                "hold", Msg.duration(settings.kothHoldSeconds * 1000L), "minutes", duration));
        Title t = Title.title(Msg.get("koth.start-title"), Msg.get("koth.start-subtitle", "koth", z.name, "x", z.x, "z", z.z),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.showTitle(t);
            p.playSound(p.getLocation(), Sound.EVENT_RAID_HORN, 0.8f, 1.3f);
        }
        plugin.bridge().kothStart("KOTH " + z.name, duration * 60);
        plugin.discord().totem("👑 KOTH " + z.name, "Le KOTH **" + z.name + "** commence en **" + z.x + ", " + z.z
                + "** : tenez la zone " + Msg.duration(settings.kothHoldSeconds * 1000L) + " sans interruption.");
        return StartResult.OK;
    }

    public void stopKoth(boolean timeout) {
        if (koth == null) return;
        Zone z = koth;
        koth = null;
        reset(z);
        hideBar(z);
        Bukkit.broadcast(Msg.prefixed(timeout ? "koth.timeout" : "koth.stopped", "koth", z.name));
    }

    private void winKoth(Zone z, Faction f, Player last) {
        koth = null;
        reset(z);
        hideBar(z);
        f.kothsWon++;
        List<String> rewards = new ArrayList<>();
        if (settings.kothRewardMoney > 0) {
            f.bank += settings.kothRewardMoney;
            rewards.add(plugin.bank().format(settings.kothRewardMoney) + " en banque");
        }
        if (settings.kothRewardPower != 0) {
            f.powerBoost += settings.kothRewardPower;
            rewards.add("+" + Msg.fmt(settings.kothRewardPower) + " power de faction");
        }
        for (String cmd : settings.kothRewardCommands) {
            String c = cmd.replace("{player}", last == null ? "" : last.getName()).replace("{faction}", f.name).replace("{koth}", z.name);
            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
        }
        plugin.manager().markDirty();
        Title t = Title.title(Msg.get("koth.win-title", "faction", f.name), Msg.get("koth.win-subtitle", "koth", z.name),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(4), Duration.ofMillis(600)));
        for (Player o : Bukkit.getOnlinePlayers()) o.showTitle(t);
        Bukkit.broadcast(Msg.prefixed("koth.won", "faction", f.name, "koth", z.name));
        if (!rewards.isEmpty()) for (Player m : plugin.manager().online(f)) Msg.send(m, "koth.reward", "rewards", String.join(", ", rewards));
        plugin.logs().add(f, "KOTH", last == null ? "—" : last.getName(), "a remporté le KOTH " + z.name);
        if (last != null) plugin.bridge().kothCapture("KOTH " + z.name, f, last.getUniqueId(), last.getName());
        plugin.discord().totem("👑 KOTH " + z.name, "**" + f.name + "** remporte le KOTH !");
    }

    // ── Boucle (chaque seconde) ──

    public void tick() {
        long now = System.currentTimeMillis();
        if (koth != null && now >= kothEndsAt) stopKoth(true);
        if (koth != null) tickZone(koth, now);
        if (settings.outpostsEnabled) for (Zone z : zones(Zone.Kind.OUTPOST)) tickZone(z, now);
        scheduleTick();
    }

    private void tickZone(Zone z, long now) {
        World w = Bukkit.getWorld(z.world);
        if (w == null) return;
        // Qui est dans la zone ?
        Map<String, List<Player>> present = new HashMap<>();
        for (Player p : w.getPlayers()) {
            if (p.isDead() || p.getGameMode() == GameMode.SPECTATOR || !z.contains(p.getLocation())) continue;
            Faction f = plugin.manager().factionOf(p);
            if (f != null) present.computeIfAbsent(f.id, k -> new ArrayList<>()).add(p);
        }
        String k = zoneKey(z);
        String cap = capturer.get(k);
        int prog = progress.getOrDefault(k, 0);
        boolean contested = present.size() > 1;
        if (present.size() == 1) {
            String fid = present.keySet().iterator().next();
            Faction f = plugin.manager().byId(fid);
            if (z.kind == Zone.Kind.OUTPOST && fid.equals(z.holder)) {
                // Le détenteur reprend la zone : toute capture adverse est annulée.
                if (cap != null && !cap.equals(fid)) reset(z);
                cap = null;
                prog = 0;
            } else {
                if (!fid.equals(cap)) {
                    cap = fid;
                    prog = 0;
                    capturer.put(k, fid);
                    if (z.kind == Zone.Kind.KOTH) Bukkit.broadcast(Msg.prefixed("koth.capturing", "faction", f.name, "koth", z.name));
                }
                prog++;
                progress.put(k, prog);
                int needed = z.kind == Zone.Kind.KOTH ? settings.kothHoldSeconds : settings.outpostCaptureSeconds;
                if (prog >= needed) {
                    Player last = present.get(fid).get(0);
                    if (z.kind == Zone.Kind.KOTH) {
                        winKoth(z, f, last);
                        return;
                    }
                    captureOutpost(z, f, last, now);
                    cap = null;
                    prog = 0;
                }
            }
        } else if (present.isEmpty() && cap != null) {
            // Zone désertée : un KOTH repart de zéro, un avant-poste perd sa progression peu à peu.
            if (z.kind == Zone.Kind.KOTH) reset(z);
            else if (--prog <= 0) reset(z);
            else progress.put(k, prog);
            cap = capturer.get(k);
            prog = progress.getOrDefault(k, 0);
        }
        // Revenu des avant-postes
        if (z.kind == Zone.Kind.OUTPOST && z.holder != null && now - z.lastIncome >= settings.outpostIncomeMinutes * 60_000L) {
            Faction h = plugin.manager().byId(z.holder);
            if (h == null) z.holder = null;
            else if (settings.outpostIncomeMoney > 0) {
                h.bank += settings.outpostIncomeMoney;
                for (Player m : plugin.manager().online(h)) Msg.send(m, "outpost.income", "outpost", z.name, "amount", plugin.bank().format(settings.outpostIncomeMoney));
            }
            z.lastIncome = now;
            plugin.manager().markDirty();
        }
        display(z, w, cap, prog, contested, now);
    }

    private void captureOutpost(Zone z, Faction f, Player last, long now) {
        Faction previous = plugin.manager().byId(z.holder);
        z.holder = f.id;
        z.heldSince = now;
        z.lastIncome = now;
        reset(z);
        f.outpostsCaptured++;
        plugin.manager().markDirty();
        Bukkit.broadcast(Msg.prefixed(previous == null ? "outpost.captured" : "outpost.taken", "faction", f.name,
                "outpost", z.name, "previous", previous == null ? "" : previous.name));
        Location c = new Location(Bukkit.getWorld(z.world), z.x + 0.5, z.y + 1, z.z + 0.5);
        c.getWorld().spawnParticle(Particle.FIREWORK, c, 80, z.radius / 2.0, 1, z.radius / 2.0, 0.05);
        c.getWorld().playSound(c, Sound.UI_TOAST_CHALLENGE_COMPLETE, 1.5f, 1.2f);
        plugin.logs().add(f, "AVANT-POSTE", last.getName(), "a capturé l'avant-poste " + z.name);
        if (previous != null) plugin.logs().add(previous, "AVANT-POSTE", f.name, "nous a pris l'avant-poste " + z.name);
        plugin.missions().progress(f, "CAPTURE_OUTPOST", 1);
        plugin.discord().totem("🏴 Avant-poste " + z.name, "**" + f.name + "** capture l'avant-poste **" + z.name + "**"
                + (previous == null ? "." : " aux dépens de **" + previous.name + "**."));
    }

    // ── Affichage ──

    private void display(Zone z, World w, String cap, int prog, boolean contested, long now) {
        Faction holder = z.kind == Zone.Kind.OUTPOST ? plugin.manager().byId(z.holder) : null;
        Faction capF = plugin.manager().byId(cap);
        int needed = z.kind == Zone.Kind.KOTH ? settings.kothHoldSeconds : settings.outpostCaptureSeconds;
        Component name;
        if (z.kind == Zone.Kind.KOTH) {
            name = Msg.get("koth.bossbar", "koth", z.name,
                    "holder", capF == null ? Msg.get("totem.nobody") : Msg.parse("<gold><n>", "n", capF.name),
                    "progress", Msg.duration(prog * 1000L), "hold", Msg.duration(needed * 1000L),
                    "time", Msg.duration(kothEndsAt - now), "state", Msg.parse(contested ? Msg.raw("zone.contested") : ""));
        } else {
            name = Msg.get("outpost.bossbar", "outpost", z.name,
                    "holder", holder == null ? Msg.get("totem.nobody") : Msg.parse("<gold><n>", "n", holder.name),
                    "capture", capF == null ? Component.empty() : Msg.get("outpost.capture-part", "faction", capF.name,
                            "progress", prog, "needed", needed),
                    "state", Msg.parse(contested ? Msg.raw("zone.contested") : ""));
        }
        String k = zoneKey(z);
        BossBar bar = bars.computeIfAbsent(k, x -> BossBar.bossBar(Component.empty(), 0f,
                z.kind == Zone.Kind.KOTH ? BossBar.Color.YELLOW : BossBar.Color.GREEN, BossBar.Overlay.PROGRESS));
        bar.name(name);
        bar.progress(Math.max(0f, Math.min(1f, prog / (float) needed)));
        Set<UUID> viewers = barViewers.computeIfAbsent(k, x -> new HashSet<>());
        Set<UUID> now2 = new HashSet<>();
        for (Player p : w.getPlayers()) {
            boolean show = z.kind == Zone.Kind.KOTH ? true : z.near(p.getLocation(), 24);
            if (!show) continue;
            now2.add(p.getUniqueId());
            if (viewers.add(p.getUniqueId())) p.showBossBar(bar);
        }
        for (var it = viewers.iterator(); it.hasNext(); ) {
            UUID u = it.next();
            if (!now2.contains(u)) {
                Player p = Bukkit.getPlayer(u);
                if (p != null) p.hideBossBar(bar);
                it.remove();
            }
        }
        // Cercle de particules au bord de la zone, toutes les 2 secondes.
        if ((now / 1000) % 2 == 0) {
            Color col = contested ? Color.RED : capF != null ? Color.YELLOW : holder != null ? Color.LIME : Color.WHITE;
            Particle.DustOptions dust = new Particle.DustOptions(col, 1.5f);
            int points = Math.max(16, z.radius * 6);
            for (int i = 0; i < points; i++) {
                double a = 2 * Math.PI * i / points;
                w.spawnParticle(Particle.DUST, z.x + 0.5 + Math.cos(a) * z.radius, z.y + 0.3, z.z + 0.5 + Math.sin(a) * z.radius, 1, dust);
            }
        }
    }

    private void hideBar(Zone z) {
        String k = zoneKey(z);
        BossBar bar = bars.remove(k);
        Set<UUID> viewers = barViewers.remove(k);
        if (bar == null || viewers == null) return;
        for (UUID u : viewers) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) p.hideBossBar(bar);
        }
    }

    public void shutdown() {
        for (Zone z : new ArrayList<>(state.zones.values())) hideBar(z);
        koth = null;
    }

    private void scheduleTick() {
        if (settings.kothSchedule.isEmpty()) return;
        ZonedDateTime now = ZonedDateTime.now(settings.zone);
        String k = now.getDayOfYear() + ":" + now.getHour() + ":" + now.getMinute();
        if (k.equals(lastScheduleKey)) return;
        lastScheduleKey = k;
        for (TotemSchedule.Entry e : settings.kothSchedule) {
            if (!e.matches(now)) continue;
            StartResult r = startKoth(e.totem(), 0, true);
            if (r != StartResult.OK && r != StartResult.ALREADY_RUNNING) plugin.getLogger().warning("KOTH programmé non lancé : " + r);
            break;
        }
    }

    public String holderName(Zone z) {
        Faction h = plugin.manager().byId(z.holder);
        return h == null ? "personne" : h.name;
    }

    public long kothRemaining() { return Math.max(0, kothEndsAt - System.currentTimeMillis()); }
}
