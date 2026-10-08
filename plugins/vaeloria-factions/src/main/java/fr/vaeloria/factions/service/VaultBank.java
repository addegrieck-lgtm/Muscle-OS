package fr.vaeloria.factions.service;

import net.milkbowl.vault.economy.Economy;
import org.bukkit.Bukkit;
import org.bukkit.OfflinePlayer;
import org.bukkit.plugin.RegisteredServiceProvider;

/** Banque adossée à Vault. Classe chargée uniquement si Vault est installé. */
final class VaultBank implements Bank {
    private final Economy eco;

    private VaultBank(Economy eco) { this.eco = eco; }

    static Bank create() {
        RegisteredServiceProvider<Economy> rsp = Bukkit.getServicesManager().getRegistration(Economy.class);
        return rsp == null ? Bank.NONE : new VaultBank(rsp.getProvider());
    }

    public boolean available() { return true; }
    public double balance(OfflinePlayer p) { return eco.getBalance(p); }
    public boolean withdraw(OfflinePlayer p, double amount) { return eco.withdrawPlayer(p, amount).transactionSuccess(); }
    public boolean deposit(OfflinePlayer p, double amount) { return eco.depositPlayer(p, amount).transactionSuccess(); }
    public String format(double amount) { return eco.format(amount); }
}
