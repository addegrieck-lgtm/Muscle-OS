package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.rules.ClaimRules;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Claim, surclaim et unclaim, avec messages, annonces et synchronisation du site. */
public final class ClaimService {
    private final Settings settings;
    private final FactionManager manager;
    private final RaidService raid;
    private final BridgeHook bridge;

    public ClaimService(Settings settings, FactionManager manager, RaidService raid, BridgeHook bridge) {
        this.settings = settings;
        this.manager = manager;
        this.raid = raid;
        this.bridge = bridge;
    }

    public ClaimRules.Result evaluate(Faction f, ChunkPos pos) {
        Faction owner = manager.factionAt(pos);
        ClaimRules.Owner o = owner == null ? ClaimRules.Owner.NONE
                : owner == f ? ClaimRules.Owner.SELF
                : owner.system ? ClaimRules.Owner.SYSTEM : ClaimRules.Owner.OTHER;
        boolean other = o == ClaimRules.Owner.OTHER;
        return ClaimRules.evaluate(new ClaimRules.Context(
                settings.disabledWorlds.contains(pos.world()),
                f.claims.size(), manager.landLimit(f), settings.claimsMax,
                manager.isConnected(f, pos), settings.mustBeConnected,
                o,
                other ? owner.claims.size() : 0,
                other ? manager.landLimit(owner) : 0,
                settings.overclaimEnabled,
                other && manager.relation(f, owner) == Relation.ENNEMI,
                settings.overclaimRequireEnemy,
                other && manager.isEdge(owner, pos),
                settings.overclaimEdgeOnly,
                other && settings.shieldBlocksOverclaim && raid.shielded(owner),
                other && raid.graceActive()));
    }

    /** @return vrai si le chunk a été pris. */
    public boolean claim(Player p, Faction f, ChunkPos pos, boolean quiet) {
        Faction previous = manager.factionAt(pos);
        ClaimRules.Result r = evaluate(f, pos);
        if (!r.success()) {
            if (!quiet || r != ClaimRules.Result.ALREADY_OWNED) {
                Msg.send(p, "claim.fail." + r.name().toLowerCase(java.util.Locale.ROOT),
                        "faction", previous == null ? "" : previous.name,
                        "limit", manager.landLimit(f), "max", settings.claimsMax);
            }
            return false;
        }
        manager.claim(f, pos);
        bridge.claim(f, pos, true);
        if (r == ClaimRules.Result.OVERCLAIM) {
            previous.overclaimsSuffered++;
            f.overclaimsDone++;
            bridge.claim(previous, pos, false);
            notifyOverclaim(p, f, previous, pos);
            var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
            if (plugin != null) {
                int bx = pos.x() * 16 + 8, bz = pos.z() * 16 + 8;
                plugin.wars().onOverclaim(f, previous, p.getUniqueId());
                plugin.discord().overclaimLost(previous, f.name, bx, bz);
                plugin.discord().overclaimWon(f, previous.name, bx, bz);
                plugin.logs().add(previous, "SURCLAIM", p.getName() + " (" + f.name + ")", "a pris le chunk " + bx + ", " + bz);
                plugin.logs().add(f, "SURCLAIM", p.getName(), "a pris le chunk " + bx + ", " + bz + " à " + previous.name);
            }
        } else {
            Msg.send(p, "claim.success", "x", pos.x(), "z", pos.z(), "claims", f.claims.size(), "limit", manager.landLimit(f));
            var plugin = fr.vaeloria.factions.VaeloriaFactionsPlugin.get();
            if (plugin != null) plugin.logs().add(f, "CLAIM", p.getName(), "chunk " + pos.x() + ", " + pos.z());
            for (Player m : manager.online(f)) {
                if (m != p) Msg.send(m, "claim.member-notice", "player", p.getName(), "x", pos.x(), "z", pos.z());
            }
        }
        return true;
    }

    private void notifyOverclaim(Player p, Faction attacker, Faction defender, ChunkPos pos) {
        Title t = Title.title(Msg.get("overclaim.title"), Msg.get("overclaim.subtitle", "defender", defender.name),
                Title.Times.times(Duration.ofMillis(150), Duration.ofSeconds(2), Duration.ofMillis(400)));
        for (Player m : manager.online(attacker)) {
            m.showTitle(t);
            m.playSound(m.getLocation(), Sound.ENTITY_WITHER_SPAWN, 0.5f, 1.4f);
        }
        Title lost = Title.title(Msg.get("overclaim.lost-title"), Msg.get("overclaim.lost-subtitle", "attacker", attacker.name,
                "x", pos.x() * 16 + 8, "z", pos.z() * 16 + 8), Title.Times.times(Duration.ofMillis(150), Duration.ofSeconds(3), Duration.ofMillis(400)));
        for (Player m : manager.online(defender)) {
            m.showTitle(lost);
            m.playSound(m.getLocation(), Sound.BLOCK_BELL_RESONATE, 1f, 0.6f);
        }
        if (settings.overclaimBroadcast) {
            Bukkit.broadcast(Msg.prefixed("overclaim.broadcast", "attacker", attacker.name, "defender", defender.name,
                    "player", p.getName()));
        } else {
            Msg.send(p, "overclaim.success", "defender", defender.name);
        }
    }

    /** Claim en carré autour du joueur, du plus proche au plus lointain pour rester connecté. */
    public int claimRadius(Player p, Faction f, ChunkPos center, int radius) {
        List<ChunkPos> targets = new ArrayList<>();
        for (int dx = -radius + 1; dx < radius; dx++)
            for (int dz = -radius + 1; dz < radius; dz++) targets.add(center.offset(dx, dz));
        targets.sort(Comparator.comparingInt(c -> Math.abs(c.x() - center.x()) + Math.abs(c.z() - center.z())));
        int done = 0;
        boolean progress = true;
        while (progress && !targets.isEmpty()) {
            progress = false;
            for (var it = targets.iterator(); it.hasNext(); ) {
                ChunkPos c = it.next();
                ClaimRules.Result r = evaluate(f, c);
                if (r == ClaimRules.Result.ALREADY_OWNED) {
                    it.remove();
                    continue;
                }
                if (r == ClaimRules.Result.NOT_ENOUGH_POWER || r == ClaimRules.Result.MAX_CLAIMS) {
                    targets.clear();
                    break;
                }
                if (r.success() && claim(p, f, c, true)) {
                    it.remove();
                    done++;
                    progress = true;
                }
            }
        }
        return done;
    }

    public enum UnclaimResult { OK, NOT_OWNED, IN_RAID }

    public UnclaimResult unclaim(Faction f, ChunkPos pos) {
        if (!f.id.equals(manager.ownerId(pos))) return UnclaimResult.NOT_OWNED;
        if (f.inRaid()) return UnclaimResult.IN_RAID;
        manager.unclaim(pos);
        bridge.claim(f, pos, false);
        return UnclaimResult.OK;
    }

    public int unclaimAll(Faction f) {
        List<ChunkPos> all = new ArrayList<>(f.claims);
        for (ChunkPos c : all) {
            manager.unclaim(c);
            bridge.claim(f, c, false);
        }
        return all.size();
    }
}
