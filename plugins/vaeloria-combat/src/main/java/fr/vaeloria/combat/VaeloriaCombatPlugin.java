package fr.vaeloria.combat;

import org.bukkit.command.PluginCommand;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * VaeloriaCombat — ce qu'un plugin peut faire pour un PvP fluide :
 * 1. MSPT mesuré à chaque tick, mode dégradé automatique si le serveur sature ;
 * 2. ping et stabilité de chaque joueur suivis (/ping, alertes staff) ;
 * 3. combat 1.8 identique pour tous (recharge, délai entre coups, knockback) ;
 * 4. recul envoyé dans le paquet vanilla, compatible avec les anticheats à prédiction.
 */
public final class VaeloriaCombatPlugin extends JavaPlugin {
    private final CombatListener combat = new CombatListener();
    private PerformanceMonitor performance;
    private PingMonitor pings;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        performance = new PerformanceMonitor(this);
        pings = new PingMonitor(this);
        reload();

        getServer().getPluginManager().registerEvents(combat, this);
        getServer().getPluginManager().registerEvents(performance, this);
        getServer().getPluginManager().registerEvents(pings, this);
        performance.start();
        pings.start();

        Commands commands = new Commands(this);
        for (String name : new String[] {"ping", "pvpstatus", "vcombat"}) {
            PluginCommand cmd = getCommand(name);
            if (cmd != null) cmd.setExecutor(commands);
        }
        getLogger().info("VaeloriaCombat actif — combat 1.8, surveillance MSPT et ping.");
    }

    @Override
    public void onDisable() {
        // Le serveur retrouve son comportement vanilla si le plugin est retiré.
        combat.restoreAll();
        if (performance != null) performance.recover();
    }

    public void reload() {
        reloadConfig();
        FileConfiguration c = getConfig();
        combat.configure(section(c, "combat"), section(c, "knockback"));
        performance.configure(section(c, "performance"));
        pings.configure(section(c, "ping"));
        combat.applyToAll();
    }

    private static ConfigurationSection section(FileConfiguration c, String path) {
        ConfigurationSection s = c.getConfigurationSection(path);
        return s != null ? s : new YamlConfiguration();
    }

    public PerformanceMonitor performance() {
        return performance;
    }

    public PingMonitor pings() {
        return pings;
    }
}
