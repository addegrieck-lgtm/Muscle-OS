package fr.vaeloria.villageois;

import net.milkbowl.vault.economy.Economy;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.RegisteredServiceProvider;

/** Classe chargée uniquement si Vault est installé. */
final class VaultBank implements Bank {
    private final Economy eco;

    private VaultBank(Economy eco) {
        this.eco = eco;
    }

    static Bank create() {
        RegisteredServiceProvider<Economy> rsp = Bukkit.getServicesManager().getRegistration(Economy.class);
        return rsp == null ? null : new VaultBank(rsp.getProvider());
    }

    public boolean has(Player player, double amount) {
        return eco.has(player, amount);
    }

    public boolean withdraw(Player player, double amount) {
        return eco.withdrawPlayer(player, amount).transactionSuccess();
    }

    public boolean deposit(Player player, double amount) {
        return eco.depositPlayer(player, amount).transactionSuccess();
    }

    public String format(double amount) {
        return eco.format(amount);
    }
}
