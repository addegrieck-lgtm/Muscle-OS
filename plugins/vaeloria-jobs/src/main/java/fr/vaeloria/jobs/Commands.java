package fr.vaeloria.jobs;

import fr.vaeloria.jobs.gui.JobsMenu;
import fr.vaeloria.jobs.gui.TreeMenu;
import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.LevelCurve;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** /metiers [metier] · info [joueur] · xp · reset · reload */
final class Commands implements TabExecutor {
    private static final String ADMIN = "vaeloria.jobs.admin";
    private final VaeloriaJobsPlugin plugin;

    Commands(VaeloriaJobsPlugin plugin) {
        this.plugin = plugin;
    }

    private Jobs jobs() { return plugin.jobs(); }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            if (sender instanceof Player p) new JobsMenu(jobs(), p).open();
            else sender.sendMessage("Console : /metiers info|xp|reset|reload");
            return true;
        }
        String sub = args[0].toLowerCase(Locale.ROOT);
        Settings.Job job = jobs().settings().job(sub);
        if (job != null && sender instanceof Player p) {
            new TreeMenu(jobs(), p, job).open();
            return true;
        }
        switch (sub) {
            case "info" -> info(sender, args);
            case "xp" -> xp(sender, args);
            case "reset" -> reset(sender, args);
            case "reload" -> {
                if (!admin(sender)) return true;
                plugin.reload();
                sender.sendMessage(Text.prefixed("<gain>Configuration rechargée, bonus recalculés."));
            }
            default -> sender.sendMessage(Text.prefixed("<loss>Métier ou commande inconnu. <steel>Métiers : <snow>"
                    + String.join(", ", jobs().settings().jobs().keySet())));
        }
        return true;
    }

    private boolean admin(CommandSender sender) {
        if (sender.hasPermission(ADMIN)) return true;
        sender.sendMessage(Text.prefixed("<loss>Permission refusée."));
        return false;
    }

    private void info(CommandSender sender, String[] args) {
        Player target;
        if (args.length >= 2) {
            target = Bukkit.getPlayerExact(args[1]);
            if (target == null) {
                sender.sendMessage(Text.prefixed("<loss>Joueur hors ligne : " + Text.esc(args[1])));
                return;
            }
        } else if (sender instanceof Player p) {
            target = p;
        } else {
            sender.sendMessage("Usage : /metiers info <joueur>");
            return;
        }
        LevelCurve curve = jobs().settings().curve();
        sender.sendMessage(Text.mm("<ruby>━━━━━━</ruby> <snow><b>MÉTIERS de " + Text.esc(target.getName()) + "</b></snow> <ruby>━━━━━━"));
        for (Settings.Job job : jobs().settings().jobs().values()) {
            JobProgress p = jobs().data(target).get(job.id());
            sender.sendMessage(Text.mm(" <gold>" + Text.esc(job.name()) + "</gold> <steel>niv. <snow>" + p.level(curve)
                    + "</snow> " + Text.bar(curve.progress(p.xp()), 10) + " <ash>" + Text.number(p.xp()) + " XP · "
                    + p.unlocked().size() + "/" + job.tree().nodes().size() + " nœuds · "
                    + p.freePoints(curve, job.tree()) + " point(s) libre(s)"));
        }
    }

    /** /metiers xp <joueur> <metier> <quantité> */
    private void xp(CommandSender sender, String[] args) {
        if (!admin(sender)) return;
        if (args.length < 4) {
            sender.sendMessage("Usage : /metiers xp <joueur> <metier> <quantité>");
            return;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        Settings.Job job = jobs().settings().job(args[2]);
        if (target == null || job == null) {
            sender.sendMessage(Text.prefixed("<loss>Joueur hors ligne ou métier inconnu."));
            return;
        }
        double amount;
        try {
            amount = Double.parseDouble(args[3].replace(',', '.'));
        } catch (NumberFormatException e) {
            sender.sendMessage(Text.prefixed("<loss>Quantité invalide."));
            return;
        }
        if (!(amount > 0)) {
            sender.sendMessage(Text.prefixed("<loss>La quantité doit être positive."));
            return;
        }
        jobs().addXp(target, job, amount);
        sender.sendMessage(Text.prefixed("<gain>+" + Text.number(amount) + " XP</gain> <steel>" + Text.esc(job.name())
                + " pour " + Text.esc(target.getName())));
    }

    /** /metiers reset <joueur> [metier] — sans métier : tous les arbres (XP conservée). « wipe » efface aussi l'XP. */
    private void reset(CommandSender sender, String[] args) {
        if (!admin(sender)) return;
        if (args.length < 2) {
            sender.sendMessage("Usage : /metiers reset <joueur> [metier] [wipe]");
            return;
        }
        Player target = Bukkit.getPlayerExact(args[1]);
        if (target == null) {
            sender.sendMessage(Text.prefixed("<loss>Joueur hors ligne : " + Text.esc(args[1])));
            return;
        }
        List<Settings.Job> list = new ArrayList<>();
        if (args.length >= 3) {
            Settings.Job job = jobs().settings().job(args[2]);
            if (job == null) {
                sender.sendMessage(Text.prefixed("<loss>Métier inconnu."));
                return;
            }
            list.add(job);
        } else {
            list.addAll(jobs().settings().jobs().values());
        }
        boolean wipe = args.length >= 4 && args[3].equalsIgnoreCase("wipe");
        for (Settings.Job job : list) {
            if (wipe) jobs().wipe(target, job);
            else jobs().resetTree(target, job, true);
        }
        sender.sendMessage(Text.prefixed("<steel>" + (wipe ? "Métier(s) effacé(s)" : "Arbre(s) réinitialisé(s)") + " pour <snow>"
                + Text.esc(target.getName())));
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> out = new ArrayList<>();
        List<String> jobIds = new ArrayList<>(jobs().settings().jobs().keySet());
        if (args.length == 1) {
            out.addAll(jobIds);
            out.add("info");
            if (sender.hasPermission(ADMIN)) out.addAll(List.of("xp", "reset", "reload"));
        } else if (args.length == 2 && List.of("info", "xp", "reset").contains(args[0].toLowerCase(Locale.ROOT))) {
            Bukkit.getOnlinePlayers().forEach(p -> out.add(p.getName()));
        } else if (args.length == 3 && List.of("xp", "reset").contains(args[0].toLowerCase(Locale.ROOT))) {
            out.addAll(jobIds);
        } else if (args.length == 4 && args[0].equalsIgnoreCase("reset")) {
            out.add("wipe");
        }
        String prefix = args[args.length - 1].toLowerCase(Locale.ROOT);
        out.removeIf(s -> !s.toLowerCase(Locale.ROOT).startsWith(prefix));
        return out;
    }
}
