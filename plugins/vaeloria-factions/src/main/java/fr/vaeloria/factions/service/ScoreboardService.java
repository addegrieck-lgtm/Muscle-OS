package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import io.papermc.paper.scoreboard.numbers.NumberFormat;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.scoreboard.Criteria;
import org.bukkit.scoreboard.DisplaySlot;
import org.bukkit.scoreboard.Objective;
import org.bukkit.scoreboard.Scoreboard;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Tableau latéral : faction, rang, power, territoire, état de pillage. Lignes définies dans messages.yml. */
public final class ScoreboardService {
    private final Settings settings;
    private final FactionManager manager;
    private final RaidService raid;
    private final Map<UUID, Scoreboard> boards = new ConcurrentHashMap<>();

    public ScoreboardService(Settings settings, FactionManager manager, RaidService raid) {
        this.settings = settings;
        this.manager = manager;
        this.raid = raid;
    }

    public void show(Player p) {
        if (!settings.scoreboardEnabled || !manager.fplayer(p).scoreboard) return;
        Scoreboard sb = Bukkit.getScoreboardManager().getNewScoreboard();
        Objective o = sb.registerNewObjective("vfactions", Criteria.DUMMY, Msg.get("scoreboard.title"));
        o.setDisplaySlot(DisplaySlot.SIDEBAR);
        o.numberFormat(NumberFormat.blank());
        boards.put(p.getUniqueId(), sb);
        p.setScoreboard(sb);
        update(p);
    }

    public void hide(Player p) {
        if (boards.remove(p.getUniqueId()) != null && p.isOnline()) {
            p.setScoreboard(Bukkit.getScoreboardManager().getMainScoreboard());
        }
    }

    public void toggle(Player p) {
        FPlayer fp = manager.fplayer(p);
        fp.scoreboard = !fp.scoreboard;
        if (fp.scoreboard) show(p);
        else hide(p);
    }

    public void updateAll() {
        for (Player p : Bukkit.getOnlinePlayers()) update(p);
    }

    public void update(Player p) {
        Scoreboard sb = boards.get(p.getUniqueId());
        if (sb == null) return;
        if (p.getScoreboard() != sb) {
            // Un autre plugin a pris la main sur le tableau : on n'insiste pas.
            boards.remove(p.getUniqueId());
            return;
        }
        Objective o = sb.getObjective("vfactions");
        if (o == null) return;
        List<Component> lines = lines(p);
        for (String entry : new ArrayList<>(sb.getEntries())) {
            if (entry.startsWith("§l") && Integer.parseInt(entry.substring(2)) >= lines.size()) sb.resetScores(entry);
        }
        for (int i = 0; i < lines.size(); i++) {
            var score = o.getScore("§l" + i);
            score.setScore(lines.size() - i);
            score.customName(lines.get(i));
        }
    }

    private List<Component> lines(Player p) {
        FPlayer fp = manager.fplayer(p);
        Faction f = manager.factionOf(p);
        Faction here = manager.factionAt(p.getLocation());
        Relation rel = manager.relation(f, here);
        String territory = here == null ? Msg.raw("territory.wilderness-name") : here.name;
        String color = here == null ? "dark_green" : here.isSafezone() ? "gold" : here.isWarzone() ? "dark_red" : rel.color();
        List<Component> out = new ArrayList<>();
        String state;
        if (f == null) state = "";
        else if (f.inRaid()) state = Msg.raw("scoreboard.state-raid");
        else if (raid.shielded(f)) state = Msg.raw("scoreboard.state-shield");
        else if (manager.isVulnerable(f)) state = Msg.raw("scoreboard.state-vulnerable");
        else state = Msg.raw("scoreboard.state-safe");
        String grace = raid.graceActive() ? Msg.duration(raid.graceRemaining()) : "";
        List<String> template = f == null ? listOf("scoreboard.lines-no-faction") : listOf("scoreboard.lines");
        for (String line : template) {
            if (line.contains("<grace>") && grace.isEmpty()) continue;
            out.add(Msg.parse(line,
                    "faction", f == null ? "" : f.name,
                    "role", f == null ? "" : f.role(p.getUniqueId()).label(),
                    "power", Msg.fmt(fp.power), "maxpower", Msg.fmt(settings.powerMax),
                    "fpower", f == null ? "0" : Msg.fmt(manager.power(f)),
                    "fmaxpower", f == null ? "0" : Msg.fmt(manager.maxPower(f)),
                    "claims", f == null ? 0 : f.claims.size(),
                    "online", f == null ? 0 : manager.online(f).size(),
                    "members", f == null ? 0 : f.members.size(),
                    "territory", Msg.parse("<" + color + "><t>", "t", territory),
                    "state", Msg.parse(state),
                    "grace", grace,
                    "kills", fp.kills, "deaths", fp.deaths));
        }
        return out;
    }

    private static List<String> listOf(String key) {
        return fr.vaeloria.factions.util.Msg.list(key);
    }

    public void clear() {
        for (UUID u : new ArrayList<>(boards.keySet())) {
            Player p = Bukkit.getPlayer(u);
            if (p != null) hide(p);
        }
        boards.clear();
    }
}
