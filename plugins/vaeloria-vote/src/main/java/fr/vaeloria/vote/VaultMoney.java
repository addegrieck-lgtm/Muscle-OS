package fr.vaeloria.vote;

import net.milkbowl.vault.economy.Economy;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.RegisteredServiceProvider;

/** Classe chargée uniquement si Vault est installé. */
final class VaultMoney implements Money {
    private final Economy eco;

    private VaultMoney(Economy eco) {
        this.eco = eco;
    }

    static Money create() {
        RegisteredServiceProvider<Economy> rsp = Bukkit.getServicesManager().getRegistration(Economy.class);
        return rsp == null ? null : new VaultMoney(rsp.getProvider());
    }

    public boolean deposit(Player player, double amount) {
        return eco.depositPlayer(player, amount).transactionSuccess();
    }

    public String format(double amount) {
        return eco.format(amount);
    }

    public String describe() {
        return "Vault (" + eco.getName() + ")";
    }
}
