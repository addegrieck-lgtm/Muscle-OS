package fr.vaeloria.jobs;

import fr.vaeloria.jobs.gui.MenuListener;
import org.bukkit.Bukkit;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.util.logging.Level;

/**
 * VaeloriaJobs — 4 métiers (Mineur, Farmer, Chasseur, Forgeron/Alchimiste). Chaque niveau donne un point
 * à dépenser dans l'arbre de protection du métier ; chaque nœud accorde un bonus 100 % vanilla
 * (attribut Minecraft ou effet de potion permanent).
 */
public final class VaeloriaJobsPlugin extends JavaPlugin {
    private Jobs jobs;
    private XpListener xpListener;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        Storage storage;
        try {
            storage = new Storage(getDataFolder().toPath());
        } catch (IOException e) {
            getLogger().log(Level.SEVERE, "Dossier de données inaccessible : plugin désactivé.", e);
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        jobs = new Jobs(this, storage, new Bonuses(this));
        xpListener = new XpListener(this, jobs, new PlacedBlocks(this));
        reload();
        getServer().getPluginManager().registerEvents(jobs, this);
        getServer().getPluginManager().registerEvents(xpListener, this);
        getServer().getPluginManager().registerEvents(new MenuListener(), this);
        PluginCommand cmd = getCommand("metiers");
        if (cmd != null) {
            Commands commands = new Commands(this);
            cmd.setExecutor(commands);
            cmd.setTabCompleter(commands);
        }
        Bukkit.getScheduler().runTaskTimer(this, jobs::autosave, 20L * 60, 20L * 60);
        Bukkit.getScheduler().runTaskTimer(this, jobs::tickPotions, 100L, 100L);
    }

    @Override
    public void onDisable() {
        if (jobs != null) jobs.shutdown();
    }

    void reload() {
        reloadConfig();
        Settings s = Settings.load(getConfig(), getLogger());
        jobs.configure(s);
        xpListener.configure(s);
        getLogger().info(String.format("%d métier(s), niveau max %d (%s XP au total).", s.jobs().size(),
                s.curve().maxLevel(), Text.number(s.curve().totalXpFor(s.curve().maxLevel()))));
    }

    Jobs jobs() { return jobs; }
}
