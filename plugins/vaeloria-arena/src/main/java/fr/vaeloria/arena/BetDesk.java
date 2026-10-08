package fr.vaeloria.arena;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.Sound;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.logging.Level;

/**
 * Guichet des paris d'un combat : débit à la mise, versement des gains à la fin, remboursement si le combat
 * est annulé. Les mises en cours sont aussi écrites sur disque : après un crash, elles sont remboursées
 * au démarrage suivant ({@link #refundLeftovers}).
 */
final class BetDesk {
    private static final String FILE = "paris-en-cours.yml";

    private final VaeloriaArenaPlugin plugin;
    private final Bank bank;
    private final BetBook book;

    BetDesk(VaeloriaArenaPlugin plugin, Bank bank, ConfigurationSection cfg) {
        this.plugin = plugin;
        this.bank = bank;
        this.book = new BetBook(cfg.getDouble("min", 100), cfg.getDouble("max", 100_000), cfg.getDouble("house-cut-percent", 0));
    }

    BetBook book() {
        return book;
    }

    String money(double amount) {
        return Msg.esc(bank.format(amount));
    }

    void place(Player p, Team team, double amount) {
        Optional<BetBook.Refusal> refusal = book.check(p.getUniqueId(), team, amount);
        if (refusal.isPresent()) {
            ConfigurationSection cfg = plugin.getConfig().getConfigurationSection("bets");
            String why = switch (refusal.get()) {
                case CLOSED -> "Les paris sont fermés : le combat a commencé.";
                case OTHER_TEAM -> "Tu as déjà misé sur " + Msg.team(team.opponent()) + "<red> : tu ne peux pas parier sur les deux équipes.";
                case BELOW_MIN -> "Mise minimum : " + money(cfg.getDouble("min", 100)) + ".";
                case ABOVE_MAX -> "Mise maximum par combat : " + money(cfg.getDouble("max", 100_000)) + ".";
            };
            p.sendMessage(Msg.of("<red>" + why));
            return;
        }
        if (!bank.has(p, amount) || !bank.withdraw(p, amount)) {
            p.sendMessage(Msg.of("<red>Tu n'as pas " + money(amount) + "."));
            return;
        }
        double total = book.add(p.getUniqueId(), p.getName(), team, amount);
        save();
        p.sendMessage(Msg.of("<green>Pari enregistré : <white>" + money(total) + "</white> sur " + Msg.team(team)
                + "<green>. Cote actuelle <gold>" + Msg.odds(book.odds(team)) + "</gold> (elle bouge jusqu'à la fermeture)."));
        p.playSound(p.getLocation(), Sound.ENTITY_EXPERIENCE_ORB_PICKUP, 1f, 1.2f);
    }

    /** Fin des paris. Sans mises des deux côtés, le pari n'a pas lieu : tout le monde est remboursé. */
    void close() {
        book.close();
        if (!book.bets().isEmpty() && !book.contested()) {
            pay(book.refundAll(), "<yellow>Personne n'a parié en face : ta mise de <white><amount></white> est remboursée.");
        }
    }

    void settle(Optional<Team> winner) {
        if (book.bets().isEmpty()) return;
        Map<UUID, BetBook.Bet> before = Map.copyOf(book.bets());
        Map<UUID, Double> payouts = book.settle(winner);
        if (winner.isEmpty()) {
            pay(payouts, "<yellow>Égalité : ta mise de <white><amount></white> est remboursée.");
            return;
        }
        pay(payouts, "<green>Pari gagné ! Tu reçois <white><amount></white>.");
        before.values().stream().filter(b -> b.team() != winner.get()).forEach(b -> {
            Player p = Bukkit.getPlayer(b.player());
            if (p != null) p.sendMessage(Msg.of("<red>Pari perdu : " + money(b.amount()) + " sur " + Msg.team(b.team()) + "<red>."));
        });
    }

    void refundAll(String why) {
        if (!book.bets().isEmpty()) pay(book.refundAll(), "<yellow>" + why + " Ta mise de <white><amount></white> est remboursée.");
    }

    private void pay(Map<UUID, Double> payouts, String message) {
        payouts.forEach((id, amount) -> {
            OfflinePlayer op = Bukkit.getOfflinePlayer(id);
            if (!bank.deposit(op, amount)) {
                plugin.getLogger().severe("Paiement de pari ÉCHOUÉ, à verser à la main : " + id + " (" + op.getName() + ") " + amount);
                return;
            }
            if (op.getPlayer() != null) {
                op.getPlayer().sendMessage(Msg.of(message.replace("<amount>", money(amount))));
            }
        });
        save();
    }

    private void save() {
        File f = new File(plugin.getDataFolder(), FILE);
        if (book.bets().isEmpty()) {
            if (f.exists() && !f.delete()) plugin.getLogger().warning("Impossible de supprimer " + FILE);
            return;
        }
        YamlConfiguration y = new YamlConfiguration();
        book.bets().forEach((id, b) -> y.set(id.toString(), b.amount()));
        try {
            y.save(f);
        } catch (IOException e) {
            plugin.getLogger().log(Level.WARNING, "Impossible d'écrire " + FILE, e);
        }
    }

    /** Mises d'un combat interrompu par un arrêt brutal du serveur : remboursées au démarrage. */
    static void refundLeftovers(VaeloriaArenaPlugin plugin, Bank bank) {
        File f = new File(plugin.getDataFolder(), FILE);
        if (!f.exists()) return;
        if (bank == null) {
            plugin.getLogger().severe(FILE + " contient des paris non remboursés, mais Vault est absent : fichier conservé.");
            return;
        }
        YamlConfiguration y = YamlConfiguration.loadConfiguration(f);
        boolean ok = true;
        for (String key : y.getKeys(false)) {
            double amount = y.getDouble(key);
            OfflinePlayer op = Bukkit.getOfflinePlayer(UUID.fromString(key));
            if (amount > 0 && bank.deposit(op, amount)) {
                plugin.getLogger().info("Pari remboursé après arrêt du serveur : " + op.getName() + " " + amount);
                y.set(key, null);
            } else if (amount > 0) {
                ok = false;
            }
        }
        try {
            if (ok) {
                if (!f.delete()) plugin.getLogger().warning("Impossible de supprimer " + FILE);
            } else {
                y.save(f);
                plugin.getLogger().severe("Certains paris n'ont pas pu être remboursés : voir " + FILE);
            }
        } catch (IOException e) {
            plugin.getLogger().log(Level.WARNING, "Impossible d'écrire " + FILE, e);
        }
    }
}
