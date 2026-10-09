package fr.vaeloria.fakeplayers;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** /fakeplayers (alias /fp) — gestion des faux joueurs. Permission : vaeloria.fakeplayers.admin. */
final class FakeCommand implements TabExecutor {
    private static final List<String> SUBS = List.of("spawn", "add", "remove", "list", "chat", "tphere", "auto", "schedule", "spawnzone", "reload");
    private static final int MAX_BULK = 100;

    private final FakePlayersPlugin plugin;

    FakeCommand(FakePlayersPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) return help(sender, label);
        FakePlayerManager manager = plugin.manager();
        switch (args[0].toLowerCase(Locale.ROOT)) {
            case "spawn" -> {
                // /fp spawn [pseudo] [body]
                boolean body = args.length >= 2 && args[args.length - 1].equalsIgnoreCase("body");
                String name = args.length >= 2 && !(args.length == 2 && body) ? args[1] : null;
                if (body && !(sender instanceof Player)) return error(sender, "Un corps ne peut être placé que par un joueur.");
                if (body && manager.bodies() == null) return error(sender, "Corps indisponibles (Minecraft 1.21.9+ requis).");
                if (name == null) name = plugin.names().next(manager.takenNames());
                if (name == null) return error(sender, "Aucun pseudo libre.");
                if (!NamePool.isValid(name)) return error(sender, "Pseudo invalide (3 à 16 caractères : lettres, chiffres, _).");
                FakePlayer fake = manager.spawn(name, false, body ? ((Player) sender).getLocation() : null, false);
                if (fake == null) return error(sender, "« " + name + " » est déjà utilisé.");
                return ok(sender, "Faux joueur « " + fake.name() + " » connecté" + (body ? " avec un corps." : "."));
            }
            case "add" -> {
                // /fp add <nombre> [durée] — sans durée : tous d'un coup ; avec : arrivées étalées (ex. 10m)
                int n = args.length >= 2 ? parse(args[1]) : -1;
                if (n < 1 || n > MAX_BULK) return error(sender, "Usage : /" + label + " add <1-" + MAX_BULK + "> [durée, ex. 30s, 10m, 1h]");
                if (args.length >= 3) {
                    long duration = Durations.parseSeconds(args[2]);
                    if (duration < 1 || duration > 86_400) return error(sender, "Durée invalide (ex. 30s, 10m, 2h ; 24h max).");
                    plugin.scheduleArrivals(n, duration);
                    return ok(sender, n + " faux joueur(s) vont arriver petit à petit sur " + args[2] + ".");
                }
                int created = 0;
                for (int i = 0; i < n && plugin.spawnRandom(false, false) != null; i++) created++;
                return ok(sender, created + " faux joueur(s) ajouté(s). Total : " + manager.count());
            }
            case "remove" -> {
                if (args.length < 2) return error(sender, "Usage : /" + label + " remove <pseudo|all>");
                if (args[1].equalsIgnoreCase("all")) {
                    int n = manager.count();
                    plugin.clearPendingArrivals();
                    manager.removeAll(false);
                    return ok(sender, n + " faux joueur(s) retiré(s).");
                }
                return manager.remove(args[1], false) ? ok(sender, "« " + args[1] + " » déconnecté.")
                        : error(sender, "Faux joueur inconnu : " + args[1]);
            }
            case "list" -> {
                String pending = plugin.pendingArrivals() > 0 ? " (" + plugin.pendingArrivals() + " arrivée(s) en attente)" : "";
                if (manager.count() == 0) return ok(sender, "Aucun faux joueur." + pending);
                List<String> parts = new ArrayList<>();
                for (FakePlayer f : manager.all()) {
                    parts.add(f.name() + (f.rank() != null ? " [" + f.rank() + "]" : "") + (f.hasBody() ? " [corps]" : "")
                            + (f.auto() ? " [auto]" : "") + (f.afk() ? " [afk]" : "") + " " + f.ping() + "ms");
                }
                return ok(sender, manager.count() + " faux joueur(s)" + pending + " : " + String.join(", ", parts));
            }
            case "chat" -> {
                // /fp chat <pseudo> <message…>
                if (args.length < 3) return error(sender, "Usage : /" + label + " chat <pseudo> <message>");
                FakePlayer fake = manager.get(args[1]);
                if (fake == null) return error(sender, "Faux joueur inconnu : " + args[1]);
                manager.chat(fake, String.join(" ", Arrays.copyOfRange(args, 2, args.length)));
                return true;
            }
            case "tphere" -> {
                if (!(sender instanceof Player player)) return error(sender, "Commande réservée aux joueurs.");
                if (manager.bodies() == null) return error(sender, "Corps indisponibles (Minecraft 1.21.9+ requis).");
                if (args.length < 2) return error(sender, "Usage : /" + label + " tphere <pseudo>");
                FakePlayer fake = manager.get(args[1]);
                if (fake == null) return error(sender, "Faux joueur inconnu : " + args[1]);
                manager.moveBody(fake, player.getLocation());
                return ok(sender, "Corps de « " + fake.name() + " » placé ici.");
            }
            case "auto" -> {
                if (args.length < 2 || !(args[1].equalsIgnoreCase("on") || args[1].equalsIgnoreCase("off"))) {
                    return error(sender, "Usage : /" + label + " auto <on|off>");
                }
                boolean on = args[1].equalsIgnoreCase("on");
                plugin.getConfig().set("auto.enabled", on);
                plugin.saveConfig();
                return ok(sender, on ? "Mode ambiance activé : les faux joueurs arrivent petit à petit."
                        : "Mode ambiance désactivé : les faux joueurs « auto » partent petit à petit.");
            }
            case "schedule" -> {
                return schedule(sender);
            }
            case "spawnzone" -> {
                // /fp spawnzone here|info
                var bots = plugin.spawnBots();
                if (bots == null) return error(sender, "Bots du spawn indisponibles : PacketEvents et tab.enabled requis.");
                if (args.length >= 3 && args[1].equalsIgnoreCase("afk")) {
                    // /fp spawnzone afk add <nom> [rayon] | remove <nom>
                    String action = args[2].toLowerCase(Locale.ROOT);
                    if (action.equals("remove") && args.length >= 4) {
                        plugin.getConfig().set("spawn-bots.afk.points." + args[3], null);
                        plugin.saveConfig();
                        bots.reload();
                        ok(sender, "Zone AFK « " + args[3] + " » supprimée.");
                    } else if (action.equals("add") && args.length >= 4) {
                        if (!(sender instanceof Player player)) return error(sender, "Commande réservée aux joueurs.");
                        double[] local = bots.local(player.getLocation());
                        if (local == null) return error(sender, "Place d'abord le spawn (/fp spawnzone here), dans ce monde.");
                        double radius = args.length >= 5 ? Math.max(1, Math.min(30, parse(args[4]))) : 3;
                        String path = "spawn-bots.afk.points." + args[3];
                        plugin.getConfig().set(path + ".x", Math.round(local[0] * 10) / 10.0);
                        plugin.getConfig().set(path + ".z", Math.round(local[1] * 10) / 10.0);
                        plugin.getConfig().set(path + ".radius", radius);
                        plugin.getConfig().set(path + ".weight", 1);
                        plugin.saveConfig();
                        bots.reload();
                        ok(sender, "Zone AFK « " + args[3] + " » ajoutée ici (rayon " + (int) radius + ").");
                    } else {
                        return error(sender, "Usage : /" + label + " spawnzone afk add <nom> [rayon] | remove <nom>");
                    }
                } else if (args.length >= 2 && args[1].equalsIgnoreCase("here")) {
                    if (!(sender instanceof Player player)) return error(sender, "Commande réservée aux joueurs.");
                    int rotation = plugin.getConfig().getInt("spawn-bots.rotation", 0);
                    var l = player.getLocation();
                    double[] a = fr.vaeloria.fakeplayers.spawn.SpawnZone.anchorFromSpawnPoint(l.getX(), l.getY(), l.getZ(), rotation,
                            plugin.getConfig().getDouble("spawn-bots.spawn-point.z", 62));
                    plugin.getConfig().set("spawn-bots.world", player.getWorld().getName());
                    plugin.getConfig().set("spawn-bots.anchor.x", a[0]);
                    plugin.getConfig().set("spawn-bots.anchor.y", a[1]);
                    plugin.getConfig().set("spawn-bots.anchor.z", a[2]);
                    plugin.saveConfig();
                    bots.reload();
                    ok(sender, "Spawn placé depuis le point d'apparition : centre de l'arbre en " + (int) a[0] + " " + (int) a[1] + " " + (int) a[2] + ".");
                }
                for (String line : bots.describe()) sender.sendMessage(Component.text(line, NamedTextColor.GRAY));
                return true;
            }
            case "reload" -> {
                plugin.reload();
                return ok(sender, "Configuration rechargée.");
            }
            default -> {
                return help(sender, label);
            }
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) return filter(SUBS, args[0]);
        String sub = args[0].toLowerCase(Locale.ROOT);
        if (args.length == 2) {
            List<String> names = plugin.manager().all().stream().map(FakePlayer::name).toList();
            return switch (sub) {
                case "remove" -> {
                    List<String> options = new ArrayList<>(names);
                    options.add("all");
                    yield filter(options, args[1]);
                }
                case "chat", "tphere" -> filter(names, args[1]);
                case "auto" -> filter(List.of("on", "off"), args[1]);
                case "add" -> filter(List.of("1", "5", "10", "20"), args[1]);
                case "schedule" -> List.of();
                case "spawnzone" -> filter(List.of("here", "info", "afk"), args[1]);
                case "spawn" -> filter(List.of("body"), args[1]);
                default -> List.of();
            };
        }
        if (args.length == 3 && sub.equals("spawn")) return filter(List.of("body"), args[2]);
        if (args.length == 3 && sub.equals("add")) return filter(List.of("30s", "5m", "10m", "30m", "1h"), args[2]);
        if (args.length == 3 && sub.equals("spawnzone") && args[1].equalsIgnoreCase("afk")) return filter(List.of("add", "remove"), args[2]);
        return List.of();
    }

    /** Résumé du planning : type de journée, cible actuelle et prévision des 12 prochaines heures. */
    private boolean schedule(CommandSender sender) {
        boolean autoOn = plugin.getConfig().getBoolean("auto.enabled", false);
        long autos = plugin.manager().all().stream().filter(FakePlayer::auto).count();
        Schedule schedule = plugin.schedule();
        if (schedule == null) {
            return ok(sender, "Planning désactivé (schedule.enabled). Mode ambiance " + (autoOn ? "actif" : "inactif")
                    + " : cible " + plugin.ambientTarget() + ", " + autos + " connecté(s).");
        }
        LocalDateTime now = plugin.now();
        LocalDate today = Schedule.logicalDate(now);
        int min = Math.max(0, plugin.getConfig().getInt("auto.min", 3));
        int max = Math.max(min, plugin.getConfig().getInt("auto.max", 10));
        sender.sendMessage(Component.text("Planning — " + now.format(DateTimeFormatter.ofPattern("EEEE d MMMM HH:mm", Locale.FRANCE)),
                NamedTextColor.GOLD));
        sender.sendMessage(Component.text("Aujourd'hui : " + schedule.describe(today) + " · demain : "
                + schedule.describe(today.plusDays(1)), NamedTextColor.GRAY));
        sender.sendMessage(Component.text("Cible : " + plugin.ambientTarget() + " (" + Math.round(schedule.percent(now))
                + " % de la courbe ; " + min + " au creux, " + max + " au pic) · connectés (auto) : " + autos
                + (autoOn ? "" : " · mode ambiance INACTIF (/fp auto on)"), NamedTextColor.GRAY));
        StringBuilder forecast = new StringBuilder("Prévision :");
        LocalDateTime hour = now.withMinute(0).withSecond(0).withNano(0);
        for (int i = 1; i <= 12; i++) {
            LocalDateTime t = hour.plusHours(i);
            forecast.append(' ').append(t.getHour()).append("h=").append(schedule.target(t, min, max, plugin.hardCap()));
        }
        sender.sendMessage(Component.text(forecast.toString(), NamedTextColor.GRAY));
        return true;
    }

    private static List<String> filter(List<String> options, String prefix) {
        String p = prefix.toLowerCase(Locale.ROOT);
        return options.stream().filter(o -> o.toLowerCase(Locale.ROOT).startsWith(p)).toList();
    }

    private static int parse(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static boolean help(CommandSender sender, String label) {
        sender.sendMessage(Component.text("VæloriaFakePlayers", NamedTextColor.GOLD));
        for (String line : List.of(
                "spawn [pseudo] [body] — connecte un faux joueur (body : corps à ta position)",
                "add <nombre> [durée] — connecte plusieurs faux joueurs (durée : arrivées étalées, ex. 10m)",
                "remove <pseudo|all> — déconnecte",
                "list — liste les faux joueurs",
                "chat <pseudo> <message> — fait parler un faux joueur",
                "tphere <pseudo> — place son corps à ta position",
                "auto <on|off> — mode ambiance (arrivées/départs automatiques)",
                "schedule — planning : cible actuelle et prévision des prochaines heures",
                "spawnzone here|info — place les bots du spawn (debout sur le point d'apparition) / vérifie",
                "spawnzone afk add <nom> [rayon] | remove <nom> — zone où les bots vont AFK (à ta position)",
                "reload — recharge config.yml")) {
            sender.sendMessage(Component.text("/" + label + " " + line, NamedTextColor.GRAY));
        }
        return true;
    }

    private static boolean ok(CommandSender sender, String message) {
        sender.sendMessage(Component.text(message, NamedTextColor.GREEN));
        return true;
    }

    private static boolean error(CommandSender sender, String message) {
        sender.sendMessage(Component.text(message, NamedTextColor.RED));
        return true;
    }
}
