package fr.vaeloria.arena;

import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;

/** Monnaie du serveur pour les paris. Uniquement via Vault : il faut pouvoir débiter le joueur. */
interface Bank {
    boolean has(OfflinePlayer player, double amount);

    boolean withdraw(OfflinePlayer player, double amount);

    boolean deposit(OfflinePlayer player, double amount);

    String format(double amount);

    /** Null si Vault ou un plugin d'économie manque : les combats ont alors lieu sans paris. */
    static Bank create() {
        if (Bukkit.getPluginManager().getPlugin("Vault") == null) return null;
        return VaultBank.create();
    }
}
