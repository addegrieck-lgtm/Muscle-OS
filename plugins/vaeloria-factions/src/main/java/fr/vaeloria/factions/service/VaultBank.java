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
    /**
     * Retrait seulement si le solde RÉEL couvre le montant. EssentialsX autorise par défaut un découvert
     * (min-money: -10000) et son has() en tient compte : sans ce contrôle, on pourrait déposer en banque de faction
     * de l'argent qu'on n'a pas, c'est-à-dire créer de la monnaie.
     */
    public boolean withdraw(OfflinePlayer p, double amount) {
        if (amount <= 0 || Double.isNaN(amount) || eco.getBalance(p) + 1e-9 < amount) return false;
        return eco.withdrawPlayer(p, amount).transactionSuccess();
    }
    public boolean deposit(OfflinePlayer p, double amount) { return eco.depositPlayer(p, amount).transactionSuccess(); }
    public String format(double amount) { return ShopHook.format(amount); }
}
