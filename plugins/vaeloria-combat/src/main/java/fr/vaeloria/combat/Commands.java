package fr.vaeloria.combat;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

import java.util.Comparator;
import java.util.List;

/** /ping, /pvpstatus et /vcombat reload. */
public final class Commands implements CommandExecutor {
    private final VaeloriaCombatPlugin plugin;

    public Commands(VaeloriaCombatPlugin plugin) {
        this.plugin = plugin;
    }

    static String msptColor(double ms) {
        return ms < 30 ? "§a" : ms < 50 ? "§e" : "§c";
    }

    static String pingColor(int ms) {
        return ms < 0 ? "§7" : ms < 60 ? "§a" : ms < 120 ? "§e" : "§c";
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        return switch (command.getName().toLowerCase()) {
            case "ping" -> ping(sender, args);
            case "pvpstatus" -> status(sender);
            case "vcombat" -> admin(sender, args);
            default -> false;
        };
    }

    private boolean ping(CommandSender sender, String[] args) {
        Player target;
        if (args.length > 0) {
            target = Bukkit.getPlayerExact(args[0]);
            if (target == null) {
                sender.sendMessage("§c[PvP] Joueur introuvable : " + args[0]);
                return true;
            }
        } else if (sender instanceof Player p) {
            target = p;
        } else {
            sender.sendMessage("Usage : /ping <joueur>");
            return true;
        }
        PingStats s = plugin.pings().of(target);
        int ping = s.ping() >= 0 ? s.ping() : target.getPing();
        sender.sendMessage("§6[PvP] §7Ping de §f" + target.getName() + "§7 : " + pingColor(ping) + ping + " ms §7(stabilité ±"
                + pingColor(s.jitter() * 3) + s.jitter() + " ms§7)");
        return true;
    }

    private boolean status(CommandSender sender) {
        PerformanceMonitor perf = plugin.performance();
        double tps = Math.min(20.0, Bukkit.getTPS()[0]);
        double avg5 = perf.recent().average();
        double avg60 = perf.minute().average();
        sender.sendMessage("§6§lVÆLORIA §7— santé PvP");
        sender.sendMessage(String.format("§7TPS : %s%.2f", tps >= 19.5 ? "§a" : tps >= 18 ? "§e" : "§c", tps));
        sender.sendMessage(String.format("§7MSPT 5 s : %s%.1f ms §7(p95 %s%.1f§7, max %s%.1f§7)",
                msptColor(avg5), avg5, msptColor(perf.recent().percentile(95)), perf.recent().percentile(95),
                msptColor(perf.recent().max()), perf.recent().max()));
        sender.sendMessage(String.format("§7MSPT 1 min : %s%.1f ms", msptColor(avg60), avg60));
        sender.sendMessage("§7Mode : " + (perf.degraded() ? "§cdégradé (simulation réduite)" : "§anormal"));

        List<Player> online = List.copyOf(Bukkit.getOnlinePlayers());
        int avgPing = (int) Math.round(online.stream().mapToInt(p -> plugin.pings().of(p).ping()).filter(v -> v >= 0).average().orElse(-1));
        sender.sendMessage("§7Ping moyen : " + pingColor(avgPing) + (avgPing < 0 ? "—" : avgPing + " ms") + " §7(" + online.size() + " joueurs)");

        if (sender.hasPermission("vaeloria.combat.alerts")) {
            online.stream()
                    .sorted(Comparator.comparingInt((Player p) -> plugin.pings().of(p).jitter()).reversed())
                    .limit(3)
                    .forEach(p -> {
                        PingStats s = plugin.pings().of(p);
                        sender.sendMessage("§8 • §f" + p.getName() + " §7" + pingColor(s.ping()) + s.ping() + " ms §7±" + s.jitter() + " ms");
                    });
        }
        return true;
    }

    private boolean admin(CommandSender sender, String[] args) {
        if (args.length == 1 && args[0].equalsIgnoreCase("reload")) {
            plugin.reload();
            sender.sendMessage("§a[PvP] Configuration rechargée et appliquée à tous les joueurs.");
            return true;
        }
        sender.sendMessage("Usage : /vcombat reload");
        return true;
    }
}
