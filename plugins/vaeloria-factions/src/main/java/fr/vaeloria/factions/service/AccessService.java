package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Location;
import org.bukkit.entity.Player;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Qui peut faire quoi, où. Point unique de décision pour toutes les protections de territoire. */
public final class AccessService {
    public static final String ZONE_BUILD_PERMISSION = "vaeloria.factions.zones.build";

    private final Settings settings;
    private final FactionManager manager;
    private final RaidService raid;
    private final Map<UUID, Long> lastDeny = new ConcurrentHashMap<>();

    public AccessService(Settings settings, FactionManager manager, RaidService raid) {
        this.settings = settings;
        this.manager = manager;
        this.raid = raid;
    }

    public boolean allowed(Player p, Location loc, FPerm perm) {
        FPlayer fp = manager.fplayer(p);
        if (fp.adminBypass) return true;
        ChunkPos pos = ChunkPos.of(loc);
        Faction owner = manager.factionAt(pos);
        if (owner == null) return true;
        if (owner.system) return p.hasPermission(ZONE_BUILD_PERMISSION);
        Faction mine = manager.factionOf(p);
        if (mine == owner) return owner.can(p.getUniqueId(), perm);
        if (granted(owner, pos, p, mine) && (perm == FPerm.BUILD || perm == FPerm.CONTAINER || perm == FPerm.DOOR)) return true;
        Relation rel = manager.relation(mine, owner);
        if (rel == Relation.ALLIE && settings.allyPerms.contains(perm)) return true;
        return settings.breachAllows.contains(perm) && raid.breached(pos, owner, mine);
    }

    /** Accès accordé sur ce chunk (/f acces) au joueur ou à sa faction. */
    public static boolean granted(Faction owner, ChunkPos pos, Player p, Faction mine) {
        java.util.Set<String> g = owner.access.get(pos.key());
        if (g == null || g.isEmpty()) return false;
        return g.contains("p:" + p.getUniqueId()) || mine != null && g.contains("f:" + mine.id);
    }

    /** Vrai si l'accès n'est permis QUE par une brèche de pillage (ennemi chez un défenseur). */
    public boolean viaBreach(Player p, Location loc, FPerm perm) {
        if (manager.fplayer(p).adminBypass) return false;
        ChunkPos pos = ChunkPos.of(loc);
        Faction owner = manager.factionAt(pos);
        if (owner == null || owner.system) return false;
        Faction mine = manager.factionOf(p);
        if (mine == owner) return false;
        if (granted(owner, pos, p, mine)) return false;
        if (manager.relation(mine, owner) == Relation.ALLIE && settings.allyPerms.contains(perm)) return false;
        return settings.breachAllows.contains(perm) && raid.breached(pos, owner, mine);
    }

    /** Vérifie et, si refusé, prévient le joueur (au plus une fois par seconde). */
    public boolean check(Player p, Location loc, FPerm perm) {
        if (allowed(p, loc, perm)) return true;
        long now = System.currentTimeMillis();
        Long last = lastDeny.get(p.getUniqueId());
        if (last == null || now - last > 1000) {
            lastDeny.put(p.getUniqueId(), now);
            Faction owner = manager.factionAt(loc);
            Faction mine = manager.factionOf(p);
            if (owner != null && owner == mine) {
                p.sendActionBar(Msg.get("protection.denied-rank", "perm", perm.label(), "role", owner.permRole(perm).label()));
            } else {
                Relation rel = manager.relation(mine, owner);
                p.sendActionBar(Msg.get("protection.denied", "faction", owner == null ? "?" : owner.name, "color", rel.color()));
            }
        }
        return false;
    }

    public void forget(UUID uuid) { lastDeny.remove(uuid); }
}
