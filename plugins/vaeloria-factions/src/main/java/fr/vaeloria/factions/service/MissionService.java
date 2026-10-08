package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.rules.MissionRules;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Sound;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Missions quotidiennes de faction. Chaque jour (minuit, fuseau du serveur), per-day missions sont tirées du
 * catalogue : les mêmes pour toutes les factions. Chaque faction progresse de son côté ; une mission accomplie
 * verse sa récompense dans la banque.
 * Types : KILL_PLAYERS, KILL_MOBS, MINE_ORES, MINE_DEEPSLATE_ORES, RAID_BLOCKS, PLAYTIME_MINUTES, CAPTURE_OUTPOST.
 */
public final class MissionService {
    private final VaeloriaFactionsPlugin plugin;
    private final Settings settings;
    private final Store.State state;

    public MissionService(VaeloriaFactionsPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
    }

    private String today() {
        return LocalDate.now(settings.zone).toString();
    }

    /** Change de jour si besoin : nouvelles missions, progression remise à zéro. */
    public void roll() {
        String day = today();
        if (day.equals(state.missionsDay) && !state.missionsToday.isEmpty()) return;
        List<String> ids = new ArrayList<>();
        for (Settings.MissionDef d : settings.missionPool) ids.add(d.id());
        state.missionsDay = day;
        state.missionsToday = MissionRules.pick(ids, settings.missionsPerDay, day);
        state.missionProgress = new HashMap<>();
        state.missionsCompleted = new HashMap<>();
        plugin.manager().markDirty();
    }

    public List<Settings.MissionDef> todays() {
        List<Settings.MissionDef> out = new ArrayList<>();
        for (String id : state.missionsToday) {
            for (Settings.MissionDef d : settings.missionPool) if (d.id().equals(id)) out.add(d);
        }
        return out;
    }

    public int progressOf(Faction f, Settings.MissionDef d) {
        Map<String, Integer> m = state.missionProgress.get(f.id);
        return m == null ? 0 : m.getOrDefault(d.id(), 0);
    }

    public boolean completed(Faction f, Settings.MissionDef d) {
        List<String> l = state.missionsCompleted.get(f.id);
        return l != null && l.contains(d.id());
    }

    public void progress(Faction f, String type, int amount) {
        if (!settings.missionsEnabled || f == null || f.system || amount <= 0) return;
        roll();
        for (Settings.MissionDef d : todays()) {
            if (!d.type().equals(type) || completed(f, d)) continue;
            Map<String, Integer> m = state.missionProgress.computeIfAbsent(f.id, k -> new HashMap<>());
            int v = Math.min(d.target(), m.getOrDefault(d.id(), 0) + amount);
            m.put(d.id(), v);
            plugin.manager().markDirty();
            if (v >= d.target()) complete(f, d);
        }
    }

    private void complete(Faction f, Settings.MissionDef d) {
        state.missionsCompleted.computeIfAbsent(f.id, k -> new ArrayList<>()).add(d.id());
        f.bank += d.reward();
        f.missionsDone++;
        plugin.manager().markDirty();
        for (Player p : plugin.manager().online(f)) {
            Msg.send(p, "missions.completed", "mission", d.label(), "reward", plugin.bank().format(d.reward()));
            p.playSound(p.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 0.7f, 1.4f);
        }
        plugin.logs().add(f, "MISSION", "—", d.label() + " (+" + plugin.bank().format(d.reward()) + ")");
        plugin.discord().member(f, "Mission accomplie : " + d.label() + " (+" + plugin.bank().format(d.reward()) + " en banque)");
    }

    public void show(CommandSender to, Faction f) {
        roll();
        ZonedDateTime now = ZonedDateTime.now(settings.zone);
        long reset = java.time.Duration.between(now, now.toLocalDate().plusDays(1).atStartOfDay(settings.zone)).toMillis();
        to.sendMessage(Msg.get("missions.header", "time", Msg.duration(reset)));
        for (Settings.MissionDef d : todays()) {
            int v = f == null ? 0 : progressOf(f, d);
            boolean done = f != null && completed(f, d);
            to.sendMessage(Msg.get(done ? "missions.line-done" : "missions.line", "mission", d.label(),
                    "bar", MissionRules.bar(v, d.target(), 10), "value", v, "target", d.target(),
                    "reward", plugin.bank().format(d.reward())));
        }
    }

    /** Chaque minute : temps de jeu des membres connectés. */
    public void tickMinute() {
        if (!settings.missionsEnabled) return;
        roll();
        for (Faction f : plugin.manager().playerFactions()) {
            int online = plugin.manager().online(f).size();
            if (online > 0) progress(f, "PLAYTIME_MINUTES", online);
        }
    }
}
