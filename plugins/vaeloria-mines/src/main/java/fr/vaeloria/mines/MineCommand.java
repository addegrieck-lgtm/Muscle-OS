package fr.vaeloria.mines;

import fr.vaeloria.mines.gui.MineEditMenu;
import fr.vaeloria.mines.gui.MinesMenu;
import fr.vaeloria.mines.model.BlockPos;
import fr.vaeloria.mines.model.Cuboid;
import fr.vaeloria.mines.model.Durations;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.model.MineIds;
import org.bukkit.Location;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * /mine [list]                     mines et temps avant réinitialisation (tous)
 * /mine info <mine>                détail d'une mine (tous)
 * /mine admin [mine]               interface admin
 * /mine create <nom>               nouvelle mine (zone = sélection en cours si elle existe)
 * /mine wand · pos1 · pos2         sélection de la zone (baguette, ou position actuelle)
 * /mine setzone <mine>             applique la sélection à la mine
 * /mine interval <mine> <délai>    ex. 15m, 1h30, 90s
 * /mine reset <mine>               réinitialisation immédiate
 * /mine tp <mine> · /mine reload
 */
public final class MineCommand implements TabExecutor {
    private static final List<String> ADMIN = List.of("list", "info", "admin", "create", "wand", "pos1", "pos2",
            "setzone", "interval", "reset", "tp", "reload");

    private final VaeloriaMinesPlugin plugin;

    public MineCommand(VaeloriaMinesPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String sub = args.length == 0 ? "list" : args[0].toLowerCase(Locale.ROOT);
        if (!sender.hasPermission("vaeloria.mines.use") && !sender.hasPermission("vaeloria.mines.admin")) {
            plugin.msg(sender, "&cTu n'as pas la permission.");
            return true;
        }
        Mine mine = args.length >= 2 ? plugin.mines().get(args[1]) : null;
        long now = System.currentTimeMillis();
        switch (sub) {
            case "list" -> list(sender, now);
            case "info" -> {
                if (mine == null) unknown(sender);
                else info(sender, mine, now);
            }
            case "admin" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                if (mine != null) new MineEditMenu(plugin, p, mine).open();
                else new MinesMenu(plugin, p).open();
            }
            case "create" -> {
                if (!admin(sender)) return true;
                if (args.length < 2) {
                    plugin.msg(sender, "&cUsage : /mine create <nom>  &7(ex. /mine create &5Mine d'obsidienne)");
                    return true;
                }
                create(sender, String.join(" ", Arrays.copyOfRange(args, 1, args.length)));
            }
            case "wand" -> {
                if (admin(sender) && sender instanceof Player p) plugin.giveWand(p);
            }
            case "pos1", "pos2" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                BlockPos pos = VaeloriaMinesPlugin.blockPos(p.getLocation());
                if (sub.equals("pos1")) plugin.pos1(p, pos);
                else plugin.pos2(p, pos);
                plugin.selectionFeedback(p, sub.equals("pos1") ? 1 : 2, pos);
            }
            case "setzone" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                if (mine == null) unknown(sender);
                else applySelection(plugin, p, mine);
            }
            case "interval" -> {
                if (!admin(sender)) return true;
                long seconds = args.length >= 3 ? Durations.parse(String.join("", Arrays.copyOfRange(args, 2, args.length))) : -1;
                if (mine == null) unknown(sender);
                else if (seconds < 0) plugin.msg(sender, "&cDélai invalide (10 s à 7 j). &7Ex. : 15m, 1h30, 90s");
                else {
                    mine.intervalSeconds(seconds, now);
                    plugin.mines().save();
                    plugin.msg(sender, mine.name() + " &7se réinitialise maintenant toutes les &f" + Durations.format(seconds) + "&7.");
                }
            }
            case "reset" -> {
                if (!admin(sender)) return true;
                if (mine == null) unknown(sender);
                else resetNow(plugin, sender, mine);
            }
            case "tp" -> {
                if (!(sender instanceof Player p)) return true;
                if (!sender.hasPermission("vaeloria.mines.tp")) {
                    plugin.msg(sender, "&cTu n'as pas la permission.");
                    return true;
                }
                Location to = mine == null ? null : plugin.arrival(mine);
                if (mine == null) unknown(sender);
                else if (to == null) plugin.msg(sender, "&cCette mine n'a ni zone ni point d'arrivée.");
                else p.teleport(to);
            }
            case "reload" -> {
                if (!admin(sender)) return true;
                plugin.msg(sender, plugin.reload() ? "Configuration et mines rechargées."
                        : "&cUne réinitialisation est en cours, réessaie dans un instant.");
            }
            default -> help(sender);
        }
        return true;
    }

    private void list(CommandSender sender, long now) {
        if (plugin.mines().all().isEmpty()) {
            plugin.msg(sender, "Aucune mine." + (sender.hasPermission("vaeloria.mines.admin") ? " &7/mine admin pour en créer une." : ""));
            return;
        }
        for (Mine m : plugin.mines().all()) {
            plugin.msg(sender, "&f" + m.id() + " &8— " + m.name() + " &8· " + plugin.state(m, now, false));
        }
    }

    private void info(CommandSender sender, Mine mine, long now) {
        plugin.msg(sender, mine.name() + " &8(" + mine.id() + ")");
        plugin.msg(sender, plugin.state(mine, now, false));
        plugin.msg(sender, "&7Toutes les &f" + Durations.format(mine.intervalSeconds()));
        if (sender.hasPermission("vaeloria.mines.admin")) {
            plugin.msg(sender, "&7Zone : &f" + (mine.region() == null ? "non définie" : mine.region() + " — " + mine.region().volume() + " blocs"));
            StringBuilder blocks = new StringBuilder();
            mine.composition().weights().keySet().forEach(b -> blocks.append(blocks.isEmpty() ? "" : ", ")
                    .append(b.toLowerCase(Locale.ROOT)).append(' ').append(Math.round(mine.composition().percent(b))).append('%'));
            plugin.msg(sender, "&7Blocs : &f" + (blocks.isEmpty() ? "aucun" : blocks));
            plugin.msg(sender, "&7Minée à &f" + Math.round(mine.minedPercent()) + "%"
                    + (mine.resetPercent() > 0 ? " &8(réinitialisation à " + mine.resetPercent() + "%)" : ""));
        }
    }

    private void create(CommandSender sender, String name) {
        String id = MineIds.slug(name);
        if (id.isEmpty()) {
            plugin.msg(sender, "&cNom invalide : utilise au moins une lettre ou un chiffre.");
            return;
        }
        if (plugin.mines().get(id) != null) {
            plugin.msg(sender, "&cLa mine « " + id + " » existe déjà.");
            return;
        }
        Mine mine = plugin.mines().create(id, name);
        plugin.msg(sender, "Mine créée : " + mine.name() + " &7(id &f" + id + "&7).");
        if (sender instanceof Player p) {
            if (plugin.selection(p) != null) applySelection(plugin, p, mine);
            new MineEditMenu(plugin, p, mine).open();
        }
    }

    /** Partagé avec l'interface admin. */
    public static void applySelection(VaeloriaMinesPlugin plugin, Player p, Mine mine) {
        Cuboid sel = plugin.selection(p);
        if (sel == null) {
            plugin.msg(p, "&cSélection incomplète : &f/mine wand &7(clic gauche + clic droit) ou &f/mine pos1 &7/ &f/mine pos2&7.");
            return;
        }
        if (mine.resetting()) {
            plugin.msg(p, "&cRéinitialisation en cours, réessaie dans un instant.");
            return;
        }
        mine.region(sel);
        mine.mined(0);
        plugin.mines().save();
        plugin.msg(p, "Zone de " + mine.name() + " &7: &f" + sel + " &8(" + sel.volume() + " blocs)");
    }

    /** Partagé avec l'interface admin. */
    public static void resetNow(VaeloriaMinesPlugin plugin, CommandSender sender, Mine mine) {
        String error = plugin.resetter().start(mine, MineResetter.Cause.MANUAL);
        plugin.msg(sender, error == null ? "Réinitialisation de " + mine.name() + " &7lancée." : "&cImpossible : " + error + ".");
    }

    private boolean admin(CommandSender sender) {
        if (sender.hasPermission("vaeloria.mines.admin")) return true;
        plugin.msg(sender, "&cTu n'as pas la permission.");
        return false;
    }

    private void unknown(CommandSender sender) {
        plugin.msg(sender, "&cMine inconnue. &7/mine list");
    }

    private void help(CommandSender sender) {
        plugin.msg(sender, "&f/mine list &7— mines et temps restant · &f/mine info <mine>");
        if (sender.hasPermission("vaeloria.mines.admin")) {
            plugin.msg(sender, "&f/mine admin &7— interface admin · &f/mine create <nom>");
            plugin.msg(sender, "&f/mine wand &7· &f/mine pos1 &7· &f/mine pos2 &7· &f/mine setzone <mine>");
            plugin.msg(sender, "&f/mine interval <mine> <15m|1h30|90s> &7· &f/mine reset <mine> &7· &f/mine tp <mine> &7· &f/mine reload");
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> options = new ArrayList<>();
        boolean admin = sender.hasPermission("vaeloria.mines.admin");
        if (args.length == 1) {
            if (admin) options.addAll(ADMIN);
            else {
                options.addAll(List.of("list", "info"));
                if (sender.hasPermission("vaeloria.mines.tp")) options.add("tp");
            }
        } else if (args.length == 2) {
            String sub = args[0].toLowerCase(Locale.ROOT);
            if (sub.equals("info") || sub.equals("tp") || admin && List.of("admin", "setzone", "interval", "reset").contains(sub)) {
                options.addAll(plugin.mines().ids());
            }
        } else if (args.length == 3 && admin && args[0].equalsIgnoreCase("interval")) {
            options.addAll(List.of("5m", "15m", "30m", "1h"));
        }
        String last = args[args.length - 1].toLowerCase(Locale.ROOT);
        return options.stream().filter(o -> o.toLowerCase(Locale.ROOT).startsWith(last)).toList();
    }
}
