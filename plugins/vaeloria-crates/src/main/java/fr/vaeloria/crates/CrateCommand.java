package fr.vaeloria.crates;

import fr.vaeloria.crates.gui.CrateEditMenu;
import fr.vaeloria.crates.gui.CratesMenu;
import fr.vaeloria.crates.gui.PreviewMenu;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.block.Block;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * /crate admin                          interface admin
 * /crate give <joueur> <coffre> [n]     donner des clés (console / boutique : renvoie false si le joueur est absent)
 * /crate giveall <coffre> [n]           une clé à chaque joueur connecté
 * /crate preview <coffre>               voir les lots
 * /crate set <coffre> · /crate unset    lier / délier le bloc visé
 * /crate list · /crate reload
 */
public final class CrateCommand implements TabExecutor {
    private static final List<String> ADMIN = List.of("admin", "give", "giveall", "preview", "set", "unset", "list", "reload");

    private final VaeloriaCratesPlugin plugin;

    public CrateCommand(VaeloriaCratesPlugin plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        String sub = args.length == 0 ? (sender.hasPermission("vaeloria.crates.admin") ? "admin" : "help") : args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "admin" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                if (args.length >= 2 && plugin.crates().get(args[1]) != null) new CrateEditMenu(plugin, p, plugin.crates().get(args[1])).open();
                else new CratesMenu(plugin, p).open();
            }
            case "give" -> { return give(sender, args); }
            case "giveall" -> giveAll(sender, args);
            case "preview" -> {
                if (!(sender instanceof Player p)) return true;
                Crate crate = args.length >= 2 ? plugin.crates().get(args[1]) : null;
                if (crate == null) plugin.msg(sender, "&cCoffre inconnu. &7/crate list");
                else new PreviewMenu(plugin, p, crate, null).open();
            }
            case "set" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                Crate crate = args.length >= 2 ? plugin.crates().get(args[1]) : null;
                Block target = p.getTargetBlockExact(6);
                if (crate == null) plugin.msg(sender, "&cCoffre inconnu. &7/crate list");
                else if (target == null) plugin.msg(sender, "&cRegarde un bloc (6 blocs max).");
                else {
                    plugin.crates().bind(crate, target);
                    plugin.msg(sender, "Ce bloc est maintenant " + crate.name() + "&7.");
                }
            }
            case "unset" -> {
                if (!admin(sender) || !(sender instanceof Player p)) return true;
                Block target = p.getTargetBlockExact(6);
                plugin.msg(sender, target != null && plugin.crates().unbind(target) ? "Coffre retiré de ce bloc." : "&cCe bloc n'est pas un coffre.");
            }
            case "list" -> {
                if (plugin.crates().all().isEmpty()) plugin.msg(sender, "Aucun coffre. &7/crate admin pour en créer un.");
                for (Crate c : plugin.crates().all()) {
                    plugin.msg(sender, "&f" + c.id() + " &8— " + c.name() + " &8(" + c.rewards().size() + " lots, "
                            + c.locations().size() + " emplacements)");
                }
            }
            case "reload" -> {
                if (!admin(sender)) return true;
                plugin.reload();
                plugin.msg(sender, "Configuration et coffres rechargés.");
            }
            default -> {
                plugin.msg(sender, "&f/crate preview <coffre> &7— voir les lots");
                if (sender.hasPermission("vaeloria.crates.admin")) {
                    plugin.msg(sender, "&f/crate admin &7— interface admin");
                    plugin.msg(sender, "&f/crate give <joueur> <coffre> [n] &7· &f/crate giveall <coffre> [n]");
                    plugin.msg(sender, "&f/crate set <coffre> &7· &f/crate unset &7(bloc visé) · &f/crate list &7· &f/crate reload");
                }
            }
        }
        return true;
    }

    private boolean admin(CommandSender sender) {
        if (sender.hasPermission("vaeloria.crates.admin")) return true;
        plugin.msg(sender, "&cTu n'as pas la permission.");
        return false;
    }

    /** Retourne false en cas d'échec : VæloriaBridge marque alors la livraison FAILED au lieu de DELIVERED. */
    private boolean give(CommandSender sender, String[] args) {
        if (!sender.hasPermission("vaeloria.crates.give")) {
            plugin.msg(sender, "&cTu n'as pas la permission.");
            return true;
        }
        if (args.length < 3) {
            plugin.msg(sender, "&cUsage : /crate give <joueur> <coffre> [nombre]");
            return true;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        Crate crate = plugin.crates().get(args[2]);
        int amount = parseAmount(args, 3);
        if (target == null) {
            plugin.msg(sender, "&cJoueur hors ligne : " + args[1]);
            return false;
        }
        if (crate == null || amount <= 0) {
            plugin.msg(sender, crate == null ? "&cCoffre inconnu : " + args[2] : "&cNombre invalide.");
            return false;
        }
        plugin.giveKeys(target, crate, amount);
        plugin.msg(sender, amount + " clé(s) " + crate.name() + " &7donnée(s) à &f" + target.getName() + "&7.");
        return true;
    }

    private void giveAll(CommandSender sender, String[] args) {
        if (!admin(sender)) return;
        Crate crate = args.length >= 2 ? plugin.crates().get(args[1]) : null;
        int amount = parseAmount(args, 2);
        if (crate == null || amount <= 0) {
            plugin.msg(sender, "&cUsage : /crate giveall <coffre> [nombre]");
            return;
        }
        for (Player p : Bukkit.getOnlinePlayers()) plugin.giveKeys(p, crate, amount);
        Bukkit.broadcast(Text.of(plugin.getConfig().getString("prefix", "")
                + "Tout le monde reçoit &f" + amount + " &7clé(s) " + crate.name() + " &7!"));
    }

    private static int parseAmount(String[] args, int index) {
        if (args.length <= index) return 1;
        try {
            int n = Integer.parseInt(args[index]);
            return n > 0 && n <= 10_000 ? n : -1;
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> options = new ArrayList<>();
        boolean admin = sender.hasPermission("vaeloria.crates.admin");
        if (args.length == 1) {
            if (admin) options.addAll(ADMIN);
            else {
                options.add("preview");
                if (sender.hasPermission("vaeloria.crates.give")) options.add("give");
            }
        } else if (args.length == 2) {
            switch (args[0].toLowerCase(Locale.ROOT)) {
                case "give" -> Bukkit.getOnlinePlayers().forEach(p -> options.add(p.getName()));
                case "giveall", "preview", "set", "admin" -> options.addAll(plugin.crates().ids());
                default -> {}
            }
        } else if (args.length == 3 && args[0].equalsIgnoreCase("give")) {
            options.addAll(plugin.crates().ids());
        }
        String last = args[args.length - 1].toLowerCase(Locale.ROOT);
        return options.stream().filter(o -> o.toLowerCase(Locale.ROOT).startsWith(last)).toList();
    }
}
