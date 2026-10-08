package fr.vaeloria.vote;

import org.bukkit.Bukkit;
import org.bukkit.command.PluginCommand;
import org.bukkit.event.Event;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.plugin.Plugin;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.UUID;
import java.util.logging.Level;

/**
 * VaeloriaVote — votes sur 3 sites, cagnotte du jour et roue (×1/×2/×3 ou quitte ou double ×4/×0),
 * rappel toutes les 30 minutes tant que des votes sont possibles.
 * Récompenses calées sur l'économie de VaeloriaShop (voir config.yml).
 */
public final class VaeloriaVotePlugin extends JavaPlugin {
    private Votes votes;
    private WheelSpin wheelSpin;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        try {
            votes = new Votes(this, new Storage(getDataFolder().toPath()));
        } catch (IOException e) {
            getLogger().log(Level.SEVERE, "Dossier de données inaccessible : plugin désactivé.", e);
            getServer().getPluginManager().disablePlugin(this);
            return;
        }
        wheelSpin = new WheelSpin(this);
        getServer().getPluginManager().registerEvents(votes, this);
        Commands commands = new Commands(this);
        for (String name : new String[] {"vote", "roue", "votes"}) {
            PluginCommand cmd = getCommand(name);
            if (cmd != null) {
                cmd.setExecutor(commands);
                cmd.setTabCompleter(commands);
            }
        }
        hookVotifier();
        Bukkit.getScheduler().runTaskTimer(this, votes::tick, 20L * 20, 20L * 20);
        // Au premier tick, tous les plugins sont chargés : l'économie de Vault est alors enregistrée.
        // Aucun joueur ne peut se connecter avant.
        Bukkit.getScheduler().runTask(this, () -> {
            reload();
            Bukkit.getOnlinePlayers().forEach(votes::data);
        });
    }

    @Override
    public void onDisable() {
        if (votes != null) votes.saveAllNow();
    }

    void reload() {
        reloadConfig();
        Settings s = Settings.load(getConfig(), getLogger());
        votes.configure(s, Money.create(this, s.moneyCommand(), s.currencySymbol()));
        if (s.testMode()) getLogger().warning("verification.test-mode est ACTIVÉ : « J'ai voté » crédite sans vérifier. À désactiver en production.");
        getLogger().info(String.format("%d site(s), roue classique ×%.2f en moyenne, quitte ou double ×%.2f.",
                s.sites().size(), s.classic().expected(), s.risky().expected()));
    }

    Votes votes() { return votes; }
    WheelSpin wheelSpin() { return wheelSpin; }

    /** NuVotifier, sans dépendance de compilation : la plupart des sites français l'utilisent. */
    @SuppressWarnings("unchecked")
    private void hookVotifier() {
        Class<? extends Event> type;
        try {
            type = (Class<? extends Event>) Class.forName("com.vexsoftware.votifier.model.VotifierEvent");
        } catch (ClassNotFoundException e) {
            getLogger().info("NuVotifier absent : votes reçus par API (/vote verifier) ou par /votes give.");
            return;
        }
        getServer().getPluginManager().registerEvent(type, new Listener() {}, EventPriority.NORMAL, (listener, event) -> {
            if (!type.isInstance(event)) return;
            try {
                Object vote = event.getClass().getMethod("getVote").invoke(event);
                String service = (String) vote.getClass().getMethod("getServiceName").invoke(vote);
                String user = (String) vote.getClass().getMethod("getUsername").invoke(vote);
                Bukkit.getScheduler().runTask(this, () -> votes.creditVotifier(service, user));
            } catch (ReflectiveOperationException ex) {
                getLogger().log(Level.WARNING, "Vote NuVotifier illisible", ex);
            }
        }, this);
        getLogger().info("NuVotifier détecté : votes reçus automatiquement (votifier-service par site).");
    }

    /** Événement vers le site via VaeloriaBridge, s'il est installé et si bridge.enabled est vrai. */
    void emitBridge(String type, UUID uuid, String name, String site) {
        if (!getConfig().getBoolean("bridge.enabled", false)) return;
        Plugin bridge = getServer().getPluginManager().getPlugin("VaeloriaBridge");
        if (bridge == null || !bridge.isEnabled()) return;
        try {
            ClassLoader cl = bridge.getClass().getClassLoader();
            Class<?> events = Class.forName("fr.vaeloria.bridge.Events", true, cl);
            Object server = bridge.getClass().getMethod("serverName").invoke(null);
            Object event = events.getMethod("withPlayer", String.class, String.class, UUID.class, String.class)
                    .invoke(null, type, server, uuid, name);
            event.getClass().getMethod("addProperty", String.class, String.class).invoke(event, "site", site);
            Method emit = bridge.getClass().getMethod("emit", event.getClass());
            emit.invoke(null, event);
        } catch (ReflectiveOperationException | LinkageError e) {
            getLogger().log(Level.FINE, "VaeloriaBridge : envoi de " + type + " impossible", e);
        }
    }
}
