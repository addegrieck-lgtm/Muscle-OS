package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import org.bukkit.Bukkit;

public final class Papi {
    private Papi() {}

    public static boolean register(VaeloriaFactionsPlugin plugin) {
        if (Bukkit.getPluginManager().getPlugin("PlaceholderAPI") == null) return false;
        try {
            PapiHook.register(plugin);
            return true;
        } catch (NoClassDefFoundError e) {
            return false;
        }
    }
}
