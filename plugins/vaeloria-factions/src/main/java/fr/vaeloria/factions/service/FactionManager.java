package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.model.Role;
import fr.vaeloria.factions.rules.PowerMath;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registre en mémoire des factions, joueurs et claims. Toutes les modifications passent par le thread principal ;
 * les structures sont concurrentes pour permettre les lectures depuis le chat (asynchrone).
 */
public final class FactionManager {
    private final Settings settings;
    private final Map<String, Faction> byId = new ConcurrentHashMap<>();
    private final Map<String, Faction> byName = new ConcurrentHashMap<>();
    private final Map<UUID, String> memberIndex = new ConcurrentHashMap<>();
    private final Map<UUID, FPlayer> players = new ConcurrentHashMap<>();
    private final Map<ChunkPos, String> claims = new ConcurrentHashMap<>();
    private volatile boolean dirty;

    public FactionManager(Settings settings) {
        this.settings = settings;
    }

    // ── Chargement ──

    public void load(List<Faction> factions, List<FPlayer> playerList, Map<String, String> claimMap) {
        byId.clear();
        byName.clear();
        memberIndex.clear();
        players.clear();
        claims.clear();
        for (Faction f : factions) {
            f.initTransient();
            register(f);
            f.members.keySet().forEach(u -> memberIndex.put(u, f.id));
        }
        ensureSystem(Faction.SAFEZONE, "SafeZone");
        ensureSystem(Faction.WARZONE, "WarZone");
        for (FPlayer p : playerList) if (p.uuid != null) players.put(p.uuid, p);
        for (Map.Entry<String, String> e : claimMap.entrySet()) {
            Faction f = byId.get(e.getValue());
            if (f == null) continue;
            ChunkPos pos = ChunkPos.parse(e.getKey());
            claims.put(pos, f.id);
            f.claims.add(pos);
        }
    }

    private void ensureSystem(String id, String name) {
        if (byId.containsKey(id)) return;
        Faction f = new Faction(id, name);
        f.system = true;
        f.description = id.equals(Faction.SAFEZONE) ? "Zone protégée : ni PvP ni construction" : "Zone de guerre : PvP sans protection";
        register(f);
    }

    private void register(Faction f) {
        byId.put(f.id, f);
        byName.put(f.name.toLowerCase(Locale.ROOT), f);
    }

    public Map<String, String> claimSnapshot() {
        Map<String, String> m = new java.util.HashMap<>();
        claims.forEach((k, v) -> m.put(k.key(), v));
        return m;
    }

    public void markDirty() { dirty = true; }
    public boolean consumeDirty() {
        boolean d = dirty;
        dirty = false;
        return d;
    }

    // ── Accès ──

    public Collection<Faction> all() { return byId.values(); }

    public List<Faction> playerFactions() {
        List<Faction> l = new ArrayList<>();
        for (Faction f : byId.values()) if (!f.system) l.add(f);
        return l;
    }

    public Collection<FPlayer> players() { return players.values(); }

    public Faction byId(String id) { return id == null ? null : byId.get(id); }

    public Faction byName(String name) { return name == null ? null : byName.get(name.toLowerCase(Locale.ROOT)); }

    public Faction safezone() { return byId.get(Faction.SAFEZONE); }
    public Faction warzone() { return byId.get(Faction.WARZONE); }

    public Faction factionOf(UUID uuid) { return byId(memberIndex.get(uuid)); }

    public Faction factionOf(Player p) { return factionOf(p.getUniqueId()); }

    public FPlayer fplayer(UUID uuid) { return players.get(uuid); }

    public FPlayer fplayer(Player p) {
        return players.computeIfAbsent(p.getUniqueId(), u -> {
            dirty = true;
            return new FPlayer(u, p.getName(), settings.powerStart);
        });
    }

    public FPlayer fplayerByName(String name) {
        for (FPlayer p : players.values()) if (p.name != null && p.name.equalsIgnoreCase(name)) return p;
        return null;
    }

    public Faction factionAt(ChunkPos pos) { return byId(claims.get(pos)); }

    public Faction factionAt(Location l) { return factionAt(ChunkPos.of(l)); }

    public String ownerId(ChunkPos pos) { return claims.get(pos); }

    // ── Cycle de vie ──

    public Faction create(String name, Player leader) {
        Faction f = new Faction(UUID.randomUUID().toString(), name);
        f.open = false;
        f.members.put(leader.getUniqueId(), Role.CHEF);
        register(f);
        memberIndex.put(leader.getUniqueId(), f.id);
        dirty = true;
        return f;
    }

    public void rename(Faction f, String name) {
        byName.remove(f.name.toLowerCase(Locale.ROOT));
        f.name = name;
        byName.put(name.toLowerCase(Locale.ROOT), f);
        dirty = true;
    }

    public void disband(Faction f) {
        for (ChunkPos pos : new ArrayList<>(f.claims)) claims.remove(pos);
        f.claims.clear();
        for (UUID u : f.members.keySet()) memberIndex.remove(u);
        f.members.clear();
        for (Faction o : byId.values()) o.wishes.remove(f.id);
        byId.remove(f.id);
        byName.remove(f.name.toLowerCase(Locale.ROOT));
        dirty = true;
    }

    public void addMember(Faction f, UUID uuid, Role role) {
        f.members.put(uuid, role);
        f.invites.remove(uuid);
        memberIndex.put(uuid, f.id);
        dirty = true;
    }

    public void removeMember(Faction f, UUID uuid) {
        f.members.remove(uuid);
        memberIndex.remove(uuid);
        dirty = true;
    }

    public void setRole(Faction f, UUID uuid, Role role) {
        f.members.put(uuid, role);
        dirty = true;
    }

    // ── Claims ──

    public void claim(Faction f, ChunkPos pos) {
        String previous = claims.put(pos, f.id);
        if (previous != null) {
            Faction old = byId.get(previous);
            if (old != null) {
                old.claims.remove(pos);
                dropPointsIn(old, pos);
            }
        }
        f.claims.add(pos);
        dirty = true;
    }

    public void unclaim(ChunkPos pos) {
        String previous = claims.remove(pos);
        if (previous != null) {
            Faction old = byId.get(previous);
            if (old != null) {
                old.claims.remove(pos);
                dropPointsIn(old, pos);
            }
        }
        dirty = true;
    }

    /** Un chunk perdu emporte le home et les warps qui s'y trouvaient. */
    private void dropPointsIn(Faction f, ChunkPos pos) {
        f.access.remove(pos.key());
        if (f.home != null && f.home.chunk().equals(pos)) f.home = null;
        f.warps.values().removeIf(w -> w.chunk().equals(pos));
    }

    public boolean isConnected(Faction f, ChunkPos pos) {
        for (ChunkPos n : pos.neighbours()) if (f.id.equals(claims.get(n))) return true;
        return false;
    }

    /** Vrai si le chunk touche un chunk qui n'appartient pas à son propriétaire (bordure du territoire). */
    public boolean isEdge(Faction owner, ChunkPos pos) {
        for (ChunkPos n : pos.neighbours()) if (!owner.id.equals(claims.get(n))) return true;
        return false;
    }

    // ── Power ──

    public double playerPower(UUID uuid) {
        FPlayer p = players.get(uuid);
        return p == null ? settings.powerStart : p.power;
    }

    /** Power bonus extérieur (avant-postes tenus), fourni par le plugin. */
    private java.util.function.ToDoubleFunction<Faction> extraPower = f -> 0;

    public void setExtraPower(java.util.function.ToDoubleFunction<Faction> fn) { this.extraPower = fn; }

    public double upgradeBonus(Faction f, fr.vaeloria.factions.model.UpgradeType t) {
        return fr.vaeloria.factions.rules.Upgrades.bonus(settings.upgrades.get(t), f.level(t));
    }

    /** Plafond absolu de claims (0 = aucun), relevé par l'amélioration Territoire. */
    public int maxClaims(Faction f) {
        return settings.claimsMax <= 0 ? 0 : settings.claimsMax + (int) upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.CLAIMS);
    }

    public int maxMembers(Faction f) {
        return settings.maxMembers + (int) upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.MEMBERS);
    }

    public int maxWarps(Faction f) {
        return settings.maxWarps + (int) upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.WARPS);
    }

    public int chestRows(Faction f) {
        return fr.vaeloria.factions.rules.Upgrades.capped(settings.chestRows, upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.CHEST), 6);
    }

    public int shieldHours(Faction f) {
        return fr.vaeloria.factions.rules.Upgrades.capped(settings.shieldHours, upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.SHIELD), 23);
    }

    private double bonusPower(Faction f) {
        return upgradeBonus(f, fr.vaeloria.factions.model.UpgradeType.POWER) + extraPower.applyAsDouble(f);
    }

    public double power(Faction f) {
        if (f.system) return 0;
        double sum = f.powerBoost + bonusPower(f);
        for (UUID u : f.members.keySet()) sum += playerPower(u);
        return PowerMath.round(sum);
    }

    public double maxPower(Faction f) {
        if (f.system) return 0;
        return PowerMath.round(f.members.size() * settings.powerMax + f.powerBoost + bonusPower(f));
    }

    public int landLimit(Faction f) {
        return PowerMath.landLimit(power(f), settings.claimsPerPower, maxClaims(f));
    }

    public boolean isVulnerable(Faction f) {
        return !f.system && PowerMath.isVulnerable(f.claims.size(), power(f), settings.claimsPerPower);
    }

    // ── Relations ──

    public Relation relation(Faction a, Faction b) {
        if (a == null || b == null || a.system || b.system) return Relation.NEUTRE;
        if (a.id.equals(b.id)) return Relation.MEMBRE;
        return Relation.resolve(a.wishToward(b.id), b.wishToward(a.id));
    }

    public Relation relation(Player a, Player b) {
        return relation(factionOf(a), factionOf(b));
    }

    public int countRelations(Faction f, Relation rel) {
        int n = 0;
        for (Faction o : byId.values()) if (o != f && !o.system && relation(f, o) == rel) n++;
        return n;
    }

    public List<Player> online(Faction f) {
        List<Player> l = new ArrayList<>();
        if (f == null) return l;
        for (UUID u : f.members.keySet()) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) l.add(p);
        }
        return l;
    }

    public String nameOf(UUID uuid) {
        FPlayer p = players.get(uuid);
        if (p != null && p.name != null) return p.name;
        String n = Bukkit.getOfflinePlayer(uuid).getName();
        return n == null ? uuid.toString().substring(0, 8) : n;
    }
}
