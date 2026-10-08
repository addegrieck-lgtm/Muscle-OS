package fr.vaeloria.factions.service;

import org.bukkit.Bukkit;

public final class Banks {
    private Banks() {}

    public static Bank detect() {
        if (Bukkit.getPluginManager().getPlugin("Vault") == null) return Bank.NONE;
        try {
            return VaultBank.create();
        } catch (NoClassDefFoundError e) {
            return Bank.NONE;
        }
    }
}
