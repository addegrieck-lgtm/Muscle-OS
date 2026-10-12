package fr.vaeloria.villageois;

import fr.vaeloria.villageois.model.BookOffer;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabExecutor;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.function.Supplier;

final class Commands implements TabExecutor {
    private final VaeloriaVillageoisPlugin plugin;
    private final Supplier<Settings> settings;
    private final Capture capture;

    Commands(VaeloriaVillageoisPlugin plugin, Supplier<Settings> settings, Capture capture) {
        this.plugin = plugin;
        this.settings = settings;
        this.capture = capture;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equals("emeraudes")) return exchange(sender);
        String sub = args.length == 0 ? "" : args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "chances" -> chances(sender, args);
            case "oeuf", "œuf" -> buyEgg(sender);
            case "give" -> give(sender, args);
            case "reload" -> {
                if (!sender.hasPermission("vaeloria.villageois.admin")) return deny(sender);
                try {
                    plugin.reload();
                    sender.sendMessage(Text.prefixed("<gain>Configuration rechargée</gain> <ash>(" + settings.get().table().offers().size() + " livres).</ash>"));
                } catch (RuntimeException e) {
                    sender.sendMessage(Text.prefixed("<loss>config.yml invalide, ancienne configuration gardée : " + Text.esc(String.valueOf(e.getMessage())) + "</loss>"));
                }
            }
            default -> help(sender);
        }
        return true;
    }

    private void help(CommandSender sender) {
        Settings s = settings.get();
        sender.sendMessage(Text.prefixed("<snow>Villageois de VÆLORIA</snow>"));
        sender.sendMessage(Text.mm("<ash>·</ash> <silver>Accroupi + clic droit sur un bibliothécaire : <snow>booster</snow> pour " + Text.emeralds(s.boostCost().forBoost(0))
                + ". Les livres jamais achetés sont relancés, les rares sortent de plus en plus souvent.</silver>"));
        sender.sendMessage(Text.mm("<ash>·</ash> <snow>/villageois chances [boosts]</snow> <silver>— probabilité de chaque livre</silver>"));
        if (s.captureEnabled()) {
            sender.sendMessage(Text.mm("<ash>·</ash> <snow>/villageois oeuf</snow> <silver>— œuf de capture"
                    + (s.eggPrice() > 0 ? " (" + Text.emeralds(s.eggPrice()) + ")" : "") + " : déplace un villageois, mais il oublie ses livres.</silver>"));
        }
        if (s.exchangeEnabled()) sender.sendMessage(Text.mm("<ash>·</ash> <snow>/emeraudes</snow> <silver>— acheter ou revendre des émeraudes</silver>"));
    }

    private void chances(CommandSender sender, String[] args) {
        Settings s = settings.get();
        int boosts = 0;
        if (args.length > 1) {
            try {
                boosts = Math.max(0, Integer.parseInt(args[1]));
            } catch (NumberFormatException e) {
                sender.sendMessage(Text.prefixed("<loss>Nombre de boosts invalide.</loss>"));
                return;
            }
        }
        int luck = s.table().luck(boosts);
        sender.sendMessage(Text.prefixed("<snow>Chances par livre tiré</snow> <ash>— " + boosts + " boost" + (boosts > 1 ? "s" : "")
                + ", chance " + luck + " / " + s.table().maxLuck() + "</ash>"));
        List<BookOffer> list = new ArrayList<>(s.table().offers());
        list.sort(Comparator.comparingInt(BookOffer::price).reversed());
        for (BookOffer o : list) {
            double c = s.table().chance(o, boosts);
            sender.sendMessage(Text.mm("<ash>·</ash> " + (o.announce() ? "<gold>" : "<snow>") + Books.name(o) + "</> <ash>—</ash> "
                    + (c > 0 ? "<gain>" + Text.percent(c) + "</gain>" : "<ash>0 %</ash>") + " <ash>— " + o.price() + " ém.</ash>"));
        }
    }

    private void buyEgg(CommandSender sender) {
        Settings s = settings.get();
        if (!(sender instanceof Player p)) {
            sender.sendMessage("Commande réservée aux joueurs.");
            return;
        }
        if (!s.captureEnabled() || s.eggPrice() <= 0) {
            p.sendMessage(Text.prefixed("<loss>L'œuf de capture n'est pas vendu ici.</loss>"));
            return;
        }
        if (!Books.takeEmeralds(p, s.eggPrice())) {
            p.sendMessage(Text.prefixed("<loss>Il te faut " + Text.emeralds(s.eggPrice()) + ".</loss> <ash>/emeraudes pour en acheter.</ash>"));
            return;
        }
        Books.give(p, capture.egg(1));
        p.sendMessage(Text.prefixed("<gain>Œuf de capture acheté.</gain> <silver>Lance-le sur un villageois.</silver>"));
    }

    private void give(CommandSender sender, String[] args) {
        if (!sender.hasPermission("vaeloria.villageois.admin")) {
            deny(sender);
            return;
        }
        Player target = args.length > 1 ? Bukkit.getPlayerExact(args[1]) : null;
        if (target == null) {
            sender.sendMessage(Text.prefixed("<loss>Usage : /villageois give <joueur> [quantité] (joueur en ligne)</loss>"));
            return;
        }
        int amount = 1;
        try {
            if (args.length > 2) amount = Math.clamp(Integer.parseInt(args[2]), 1, 64);
        } catch (NumberFormatException ignored) {
            // quantité par défaut
        }
        Books.give(target, capture.egg(amount));
        sender.sendMessage(Text.prefixed("<gain>" + amount + " œuf(s) de capture donné(s) à " + Text.esc(target.getName()) + ".</gain>"));
    }

    private boolean exchange(CommandSender sender) {
        if (!(sender instanceof Player p)) {
            sender.sendMessage("Commande réservée aux joueurs.");
            return true;
        }
        Bank bank = plugin.bank();
        if (!settings.get().exchangeEnabled() || bank == null) {
            p.sendMessage(Text.prefixed("<loss>Le change d'émeraudes se fait au marché :</loss> <snow>/shop</snow>"));
            return true;
        }
        new ExchangeMenu(p, bank, settings).open();
        return true;
    }

    private static boolean deny(CommandSender sender) {
        sender.sendMessage(Text.prefixed("<loss>Permission refusée.</loss>"));
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (command.getName().equals("emeraudes")) return List.of();
        if (args.length == 1) {
            List<String> subs = new ArrayList<>(List.of("chances", "oeuf"));
            if (sender.hasPermission("vaeloria.villageois.admin")) subs.addAll(List.of("give", "reload"));
            return subs.stream().filter(x -> x.startsWith(args[0].toLowerCase(Locale.ROOT))).toList();
        }
        if (args.length == 2 && args[0].equalsIgnoreCase("give") && sender.hasPermission("vaeloria.villageois.admin")) {
            return Bukkit.getOnlinePlayers().stream().map(Player::getName)
                    .filter(n -> n.toLowerCase(Locale.ROOT).startsWith(args[1].toLowerCase(Locale.ROOT))).toList();
        }
        return List.of();
    }
}
