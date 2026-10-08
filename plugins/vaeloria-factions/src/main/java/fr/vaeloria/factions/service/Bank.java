package fr.vaeloria.factions.service;

import org.bukkit.OfflinePlayer;

/** Économie du serveur, vue de la banque de faction. */
public interface Bank {
    boolean available();
    double balance(OfflinePlayer p);
    boolean withdraw(OfflinePlayer p, double amount);
    boolean deposit(OfflinePlayer p, double amount);
    String format(double amount);

    Bank NONE = new Bank() {
        public boolean available() { return false; }
        public double balance(OfflinePlayer p) { return 0; }
        public boolean withdraw(OfflinePlayer p, double amount) { return false; }
        public boolean deposit(OfflinePlayer p, double amount) { return false; }
        public String format(double amount) { return ShopHook.format(amount); }
    };
}
