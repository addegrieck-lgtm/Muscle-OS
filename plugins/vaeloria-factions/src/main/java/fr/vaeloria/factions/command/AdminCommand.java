package fr.vaeloria.factions.command;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.rules.PowerMath;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** /f admin — zones, power, grâce, maintenance. Permission vaeloria.factions.admin. */
final class AdminCommand {
    private final VaeloriaFactionsPlugin plugin;

    AdminCommand(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private FactionManager m() { return plugin.manager(); }

    void run(CommandSender s, Player p, String[] a) {
        if (a.length == 0) {
            Msg.send(s, "admin.help");
            return;
        }
        switch (a[0].toLowerCase(Locale.ROOT)) {
            case "bypass" -> {
                if (p == null) { Msg.send(s, "error.player-only"); return; }
                FPlayer fp = m().fplayer(p);
                fp.adminBypass = !fp.adminBypass;
                Msg.send(p, fp.adminBypass ? "admin.bypass-on" : "admin.bypass-off");
            }
            case "safezone", "warzone" -> {
                if (p == null) { Msg.send(s, "error.player-only"); return; }
                Faction zone = a[0].equalsIgnoreCase("safezone") ? m().safezone() : m().warzone();
                int r = a.length > 1 ? FactionCommand.parseInt(a[1], 1) : 1;
                r = Math.max(1, Math.min(20, r));
                ChunkPos c = ChunkPos.of(p.getLocation());
                int n = 0;
                for (int dx = -r + 1; dx < r; dx++) for (int dz = -r + 1; dz < r; dz++) {
                    ChunkPos t = c.offset(dx, dz);
                    Faction prev = m().factionAt(t);
                    if (prev == zone) continue;
                    if (prev != null) plugin.bridge().claim(prev, t, false);
                    m().claim(zone, t);
                    n++;
                }
                Msg.send(p, "admin.zone-claimed", "zone", zone.name, "count", n);
            }
            case "unclaim" -> {
                if (p == null) { Msg.send(s, "error.player-only"); return; }
                int r = a.length > 1 ? Math.max(1, Math.min(20, FactionCommand.parseInt(a[1], 1))) : 1;
                ChunkPos c = ChunkPos.of(p.getLocation());
                int n = 0;
                for (int dx = -r + 1; dx < r; dx++) for (int dz = -r + 1; dz < r; dz++) {
                    ChunkPos t = c.offset(dx, dz);
                    Faction prev = m().factionAt(t);
                    if (prev == null) continue;
                    plugin.bridge().claim(prev, t, false);
                    m().unclaim(t);
                    n++;
                }
                Msg.send(p, "admin.unclaimed", "count", n);
            }
            case "dissoudre", "disband" -> {
                if (a.length < 2) { Msg.send(s, "error.usage", "usage", "/f admin dissoudre <faction>"); return; }
                Faction f = m().byName(a[1]);
                if (f == null || f.system) { Msg.send(s, "error.faction-not-found", "faction", a[1]); return; }
                plugin.disband(f);
                Bukkit.broadcast(Msg.prefixed("faction.disbanded-broadcast", "player", s.getName(), "faction", f.name));
            }
            case "setpower" -> {
                if (a.length < 3) { Msg.send(s, "error.usage", "usage", "/f admin setpower <joueur> <valeur>"); return; }
                Player t = Bukkit.getPlayerExact(a[1]);
                FPlayer fp = t != null ? m().fplayer(t) : m().fplayerByName(a[1]);
                if (fp == null) { Msg.send(s, "error.player-not-found", "player", a[1]); return; }
                double v = parseDouble(a[2]);
                if (Double.isNaN(v)) { Msg.send(s, "error.usage", "usage", "/f admin setpower <joueur> <valeur>"); return; }
                fp.power = PowerMath.round(PowerMath.clamp(v, plugin.settings().powerMin, plugin.settings().powerMax));
                m().markDirty();
                Msg.send(s, "admin.power-set", "player", fp.name, "power", Msg.fmt(fp.power));
            }
            case "powerboost" -> {
                if (a.length < 3) { Msg.send(s, "error.usage", "usage", "/f admin powerboost <faction> <valeur>"); return; }
                Faction f = m().byName(a[1]);
                if (f == null || f.system) { Msg.send(s, "error.faction-not-found", "faction", a[1]); return; }
                double v = parseDouble(a[2]);
                if (Double.isNaN(v)) { Msg.send(s, "error.usage", "usage", "/f admin powerboost <faction> <valeur>"); return; }
                f.powerBoost = v;
                m().markDirty();
                Msg.send(s, "admin.boost-set", "faction", f.name, "boost", Msg.fmt(v));
            }
            case "grace" -> {
                if (a.length < 2) {
                    Msg.send(s, "admin.grace-status", "state", plugin.raid().graceActive() ? Msg.duration(plugin.raid().graceRemaining()) : "inactive");
                    return;
                }
                if (a[1].equalsIgnoreCase("off")) {
                    plugin.raid().setGrace(0);
                    Bukkit.broadcast(Msg.prefixed("grace.ended"));
                    return;
                }
                double hours = parseDouble(a[1]);
                if (Double.isNaN(hours) || hours <= 0) { Msg.send(s, "error.usage", "usage", "/f admin grace <heures|off>"); return; }
                plugin.raid().setGrace(System.currentTimeMillis() + (long) (hours * 3_600_000L));
                Bukkit.broadcast(Msg.prefixed("grace.started", "time", Msg.duration((long) (hours * 3_600_000L))));
            }
            case "eclats", "shards" -> {
                if (a.length < 2) { Msg.send(s, "error.usage", "usage", "/f admin eclats <joueur> [nombre]"); return; }
                Player t = Bukkit.getPlayerExact(a[1]);
                if (t == null) { Msg.send(s, "error.player-offline", "player", a[1]); return; }
                int n = a.length > 2 ? Math.max(1, Math.min(64 * 36, FactionCommand.parseInt(a[2], 1))) : 9;
                while (n > 0) {
                    int k = Math.min(64, n);
                    t.getInventory().addItem(plugin.obsidian().shard(k)).values().forEach(it -> t.getWorld().dropItem(t.getLocation(), it));
                    n -= k;
                }
                Msg.send(s, "admin.shards-given", "player", t.getName());
            }
            case "reload" -> {
                plugin.reloadAll();
                Msg.send(s, "admin.reloaded");
            }
            case "save" -> {
                plugin.save(false);
                Msg.send(s, "admin.saved");
            }
            default -> Msg.send(s, "admin.help");
        }
    }

    private static double parseDouble(String s) {
        try {
            return Double.parseDouble(s.replace(',', '.'));
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    List<String> complete(CommandSender s, String[] a) {
        if (a.length <= 1) return List.of("bypass", "safezone", "warzone", "unclaim", "dissoudre", "setpower", "powerboost", "grace", "eclats", "reload", "save");
        String sub = a[0].toLowerCase(Locale.ROOT);
        if (a.length == 2) {
            return switch (sub) {
                case "dissoudre", "disband", "powerboost" -> {
                    List<String> l = new ArrayList<>();
                    for (Faction f : m().playerFactions()) l.add(f.name);
                    yield l;
                }
                case "setpower", "eclats", "shards" -> FactionCommand.onlineNames();
                case "grace" -> List.of("24", "48", "72", "off");
                case "safezone", "warzone", "unclaim" -> List.of("1", "2", "3", "5");
                default -> List.of();
            };
        }
        return List.of();
    }
}
