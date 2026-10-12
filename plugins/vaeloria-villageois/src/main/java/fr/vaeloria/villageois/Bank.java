package fr.vaeloria.villageois;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.Plugin;

/** Argent des joueurs pour le change d'émeraudes. Vault uniquement : sans lui, pas de change. */
interface Bank {
    boolean has(Player player, double amount);

    boolean withdraw(Player player, double amount);

    boolean deposit(Player player, double amount);

    String format(double amount);

    static Bank create(Plugin plugin) {
        if (Bukkit.getPluginManager().getPlugin("Vault") == null) {
            plugin.getLogger().warning("Vault absent : /emeraudes est désactivé.");
            return null;
        }
        Bank vault = VaultBank.create();
        if (vault == null) plugin.getLogger().warning("Vault est présent mais aucun plugin d'économie n'est enregistré : /emeraudes est désactivé.");
        return vault;
    }
}
