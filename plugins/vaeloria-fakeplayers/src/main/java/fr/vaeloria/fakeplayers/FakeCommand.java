package fr.vaeloria.fakeplayers;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** /fakeplayers (alias /fp) — gestion des faux joueurs. Permission : vaeloria.fakeplayers.admin. */
final class FakeCommand implements TabExecutor {
    private static final List<String> SUBS = List.of("spawn", "add", "remove", "list", "chat", "tphere", "auto", "reload");
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
                // /fp add <nombre>
                int n = args.length >= 2 ? parse(args[1]) : -1;
                if (n < 1 || n > MAX_BULK) return error(sender, "Usage : /" + label + " add <1-" + MAX_BULK + ">");
                int created = 0;
                for (int i = 0; i < n && plugin.spawnRandom(false, false) != null; i++) created++;
                return ok(sender, created + " faux joueur(s) ajouté(s). Total : " + manager.count());
            }
            case "remove" -> {
                if (args.length < 2) return error(sender, "Usage : /" + label + " remove <pseudo|all>");
                if (args[1].equalsIgnoreCase("all")) {
                    int n = manager.count();
                    manager.removeAll(false);
                    return ok(sender, n + " faux joueur(s) retiré(s).");
                }
                return manager.remove(args[1], false) ? ok(sender, "« " + args[1] + " » déconnecté.")
                        : error(sender, "Faux joueur inconnu : " + args[1]);
            }
            case "list" -> {
                if (manager.count() == 0) return ok(sender, "Aucun faux joueur.");
                List<String> parts = new ArrayList<>();
                for (FakePlayer f : manager.all()) {
                    parts.add(f.name() + (f.hasBody() ? " [corps]" : "") + (f.auto() ? " [auto]" : "") + " " + f.ping() + "ms");
                }
                return ok(sender, manager.count() + " faux joueur(s) : " + String.join(", ", parts));
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
                if (!on) manager.all().stream().filter(FakePlayer::auto).forEach(f -> manager.remove(f.name(), false));
                return ok(sender, "Mode ambiance " + (on ? "activé." : "désactivé."));
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
                case "spawn" -> filter(List.of("body"), args[1]);
                default -> List.of();
            };
        }
        if (args.length == 3 && sub.equals("spawn")) return filter(List.of("body"), args[2]);
        return List.of();
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
                "add <nombre> — connecte plusieurs faux joueurs aux pseudos aléatoires",
                "remove <pseudo|all> — déconnecte",
                "list — liste les faux joueurs",
                "chat <pseudo> <message> — fait parler un faux joueur",
                "tphere <pseudo> — place son corps à ta position",
                "auto <on|off> — mode ambiance (arrivées/départs automatiques)",
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
