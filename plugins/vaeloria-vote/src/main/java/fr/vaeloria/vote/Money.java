package fr.vaeloria.vote;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;

import java.util.Locale;

/** Versement d'argent : Vault (comme VaeloriaShop) ou, à défaut, une commande console. */
interface Money {
    boolean deposit(Player player, double amount);

    String format(double amount);

    String describe();

    static Money create(Plugin plugin, String command, String symbol) {
        if (Bukkit.getPluginManager().getPlugin("Vault") != null) {
            Money vault = VaultMoney.create();
            if (vault != null) return vault;
            plugin.getLogger().warning("Vault est présent mais aucun plugin d'économie n'est enregistré.");
        }
        if (command != null && !command.isBlank()) return new CommandMoney(command, symbol);
        plugin.getLogger().warning("Aucune économie : l'argent des votes ne sera PAS versé (installer Vault ou renseigner money-command).");
        return new CommandMoney("", symbol);
    }

    static String plain(double amount, String symbol) {
        String n = amount == Math.rint(amount)
                ? String.format(Locale.FRANCE, "%,.0f", amount)
                : String.format(Locale.FRANCE, "%,.2f", amount);
        return n.replace(' ', ' ').replace(' ', ' ') + " " + symbol;
    }

    /** Ex. « eco give {player} {amount} » (EssentialsX). */
    record CommandMoney(String command, String symbol) implements Money {
        public boolean deposit(Player player, double amount) {
            if (command.isBlank()) return false;
            String amountText = amount == Math.rint(amount) ? String.valueOf((long) amount) : String.format(Locale.ROOT, "%.2f", amount);
            return Bukkit.dispatchCommand(Bukkit.getConsoleSender(),
                    command.replace("{player}", player.getName()).replace("{amount}", amountText));
        }

        public String format(double amount) {
            return Money.plain(amount, symbol);
        }

        public String describe() {
            return command.isBlank() ? "aucune" : "commande « " + command + " »";
        }
    }
}
