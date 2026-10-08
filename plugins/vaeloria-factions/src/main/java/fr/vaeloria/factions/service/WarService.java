package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.model.War;
import fr.vaeloria.factions.rules.WarRules;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Sound;
import org.bukkit.entity.Player;

import java.time.Duration;
import java.util.ArrayList;
import java.util.UUID;

/**
 * Guerres officielles : déclaration, préparation, combat chronométré, score (kills, pillages, surclaims), vainqueur.
 * Les guerres sont publiées sur le site (/guerres) via WAR_START / WAR_END.
 */
public final class WarService {
    public enum DeclareResult { OK, DISABLED, SELF, ATTACKER_BUSY, DEFENDER_BUSY, COOLDOWN, TOO_FEW_MEMBERS, TARGET_TOO_FEW_MEMBERS }

    private final Settings settings;
    private final FactionManager manager;
    private final Store.State state;
    private final BridgeHook bridge;
    private final DiscordService discord;
    private final LogService logs;

    public WarService(Settings settings, FactionManager manager, Store.State state, BridgeHook bridge, DiscordService discord, LogService logs) {
        this.settings = settings;
        this.manager = manager;
        this.state = state;
        this.bridge = bridge;
        this.discord = discord;
        this.logs = logs;
    }

    public War warOf(Faction f) {
        if (f == null) return null;
        for (War w : state.wars) if (w.involves(f.id)) return w;
        return null;
    }

    public War warBetween(Faction a, Faction b) {
        if (a == null || b == null) return null;
        War w = warOf(a);
        return w != null && w.involves(b.id) ? w : null;
    }

    public long cooldownRemaining(Faction a, Faction b) {
        Long end = state.warCooldowns.get(WarRules.pairKey(a.id, b.id));
        if (end == null) return 0;
        return Math.max(0, end + settings.warCooldownHours * 3_600_000L - System.currentTimeMillis());
    }

    public DeclareResult declare(Faction attacker, Faction defender, String by) {
        if (!settings.warEnabled) return DeclareResult.DISABLED;
        if (attacker == defender) return DeclareResult.SELF;
        if (warOf(attacker) != null) return DeclareResult.ATTACKER_BUSY;
        if (warOf(defender) != null) return DeclareResult.DEFENDER_BUSY;
        if (cooldownRemaining(attacker, defender) > 0) return DeclareResult.COOLDOWN;
        if (attacker.members.size() < settings.warMinMembers) return DeclareResult.TOO_FEW_MEMBERS;
        if (defender.members.size() < settings.warMinMembers) return DeclareResult.TARGET_TOO_FEW_MEMBERS;

        long now = System.currentTimeMillis();
        War w = new War();
        w.id = UUID.randomUUID().toString();
        w.attackerId = attacker.id;
        w.defenderId = defender.id;
        w.attackerName = attacker.name;
        w.defenderName = defender.name;
        w.declaredAt = now;
        w.startAt = now + settings.warPreparationMinutes * 60_000L;
        w.endAt = w.startAt + settings.warDurationHours * 3_600_000L;
        state.wars.add(w);
        // Une guerre officielle implique d'être ennemis.
        attacker.wishes.put(defender.id, Relation.ENNEMI);
        manager.markDirty();

        Bukkit.broadcast(Msg.prefixed("war.declared-broadcast", "attacker", attacker.name, "defender", defender.name,
                "time", Msg.duration(w.startAt - now)));
        logs.add(attacker, "GUERRE", by, "a déclaré la guerre à " + defender.name);
        logs.add(defender, "GUERRE", by, attacker.name + " vous a déclaré la guerre");
        discord.war(attacker, defender, "⚔ Guerre déclarée",
                "**" + attacker.name + "** déclare la guerre à **" + defender.name + "**. Début dans " + Msg.duration(w.startAt - now)
                        + ", durée " + settings.warDurationHours + " h.", true);
        if (settings.warPreparationMinutes == 0) start(w);
        return DeclareResult.OK;
    }

    private void start(War w) {
        w.started = true;
        manager.markDirty();
        bridge.warStart(w);
        Title t = Title.title(Msg.get("war.start-title"), Msg.get("war.start-subtitle", "attacker", w.attackerName, "defender", w.defenderName),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (Faction f : new Faction[]{manager.byId(w.attackerId), manager.byId(w.defenderId)}) {
            for (Player p : manager.online(f)) {
                p.showTitle(t);
                p.playSound(p.getLocation(), Sound.EVENT_RAID_HORN, 1f, 0.8f);
            }
        }
        Bukkit.broadcast(Msg.prefixed("war.started-broadcast", "attacker", w.attackerName, "defender", w.defenderName,
                "hours", settings.warDurationHours));
        discord.war(manager.byId(w.attackerId), manager.byId(w.defenderId), "⚔ La guerre commence",
                "**" + w.attackerName + "** contre **" + w.defenderName + "** — " + settings.warDurationHours + " h de combat.", true);
    }

    /** Termine une guerre. forcedWinnerId : vainqueur imposé (reddition, dissolution), sinon au score. */
    public void end(War w, String forcedWinnerId, String reason) {
        if (!state.wars.remove(w)) return;
        Faction a = manager.byId(w.attackerId), d = manager.byId(w.defenderId);
        String winnerId;
        if (forcedWinnerId != null) winnerId = forcedWinnerId;
        else winnerId = switch (WarRules.winner(w.attackerScore, w.defenderScore)) {
            case ATTACKER -> w.attackerId;
            case DEFENDER -> w.defenderId;
            case DRAW -> null;
        };
        Faction winner = manager.byId(winnerId), loser = winnerId == null ? null : manager.byId(w.opponentOf(winnerId));
        if (winner != null) winner.warsWon++;
        if (loser != null) loser.warsLost++;
        state.warCooldowns.put(WarRules.pairKey(w.attackerId, w.defenderId), System.currentTimeMillis());
        manager.markDirty();
        if (w.started || forcedWinnerId != null) {
            if (!w.started) bridge.warStart(w); // le site doit connaître la guerre avant sa fin
            String winnerName = winnerId == null ? null : winnerId.equals(w.attackerId) ? w.attackerName : w.defenderName;
            bridge.warEnd(w, winnerName);
        }
        String result = winnerId == null ? Msg.raw("war.draw") : (winnerId.equals(w.attackerId) ? w.attackerName : w.defenderName);
        Bukkit.broadcast(Msg.prefixed(winnerId == null ? "war.ended-draw" : "war.ended-broadcast",
                "attacker", w.attackerName, "defender", w.defenderName, "winner", result,
                "ascore", w.attackerScore, "dscore", w.defenderScore, "reason", reason == null ? "" : reason));
        String text = "**" + w.attackerName + "** " + w.attackerScore + " – " + w.defenderScore + " **" + w.defenderName + "**\n"
                + (winnerId == null ? "Match nul." : "Victoire de **" + result + "**.") + (reason == null ? "" : " " + reason);
        discord.war(a, d, "🏁 Fin de la guerre", text, true);
        if (a != null) logs.add(a, "GUERRE", "—", "fin de la guerre contre " + w.defenderName + " : " + w.attackerScore + "-" + w.defenderScore);
        if (d != null) logs.add(d, "GUERRE", "—", "fin de la guerre contre " + w.attackerName + " : " + w.defenderScore + "-" + w.attackerScore);
    }

    public void tick() {
        long now = System.currentTimeMillis();
        for (War w : new ArrayList<>(state.wars)) {
            switch (WarRules.phase(now, w.startAt, w.endAt)) {
                case ACTIVE -> { if (!w.started) start(w); }
                case OVER -> {
                    if (!w.started) start(w);
                    end(w, null, null);
                }
                default -> { }
            }
        }
    }

    // ── Score ──

    private void score(Faction scorer, Faction victim, int points, UUID... participants) {
        War w = warBetween(scorer, victim);
        if (w == null || !w.started || points <= 0) return;
        if (w.isAttacker(scorer.id)) w.attackerScore += points;
        else w.defenderScore += points;
        for (UUID u : participants) if (u != null) w.participants.add(u);
        manager.markDirty();
        for (Faction f : new Faction[]{scorer, victim}) {
            for (Player p : manager.online(f)) {
                p.sendActionBar(Msg.get("war.score-actionbar", "attacker", w.attackerName, "defender", w.defenderName,
                        "ascore", w.attackerScore, "dscore", w.defenderScore));
            }
        }
    }

    public void onKill(Faction killerF, Faction victimF, UUID killer, UUID victim) {
        score(killerF, victimF, settings.warPointsKill, killer, victim);
    }

    public void onRaid(Faction attacker, Faction defender) {
        score(attacker, defender, settings.warPointsRaid);
    }

    public void onOverclaim(Faction attacker, Faction defender, UUID who) {
        War w = warBetween(attacker, defender);
        if (w != null && w.started) {
            if (w.isAttacker(attacker.id)) w.attackerOverclaims++;
            else w.defenderOverclaims++;
        }
        score(attacker, defender, settings.warPointsOverclaim, who);
    }

    public void onDisband(Faction f) {
        War w = warOf(f);
        if (w != null) end(w, w.opponentOf(f.id), Msg.raw("war.reason-disband"));
    }

    public void surrender(Faction f) {
        War w = warOf(f);
        if (w != null) end(w, w.opponentOf(f.id), Msg.raw("war.reason-surrender"));
    }

    /** Ligne de tableau : « vs Loups 12-8 », ou vide. */
    public String scoreboardLine(Faction f) {
        War w = warOf(f);
        if (w == null) return "";
        boolean att = w.isAttacker(f.id);
        String opp = att ? w.defenderName : w.attackerName;
        if (!w.started) return opp + " (" + Msg.duration(w.startAt - System.currentTimeMillis()) + ")";
        int mine = att ? w.attackerScore : w.defenderScore, theirs = att ? w.defenderScore : w.attackerScore;
        return opp + " " + mine + "-" + theirs;
    }

}
