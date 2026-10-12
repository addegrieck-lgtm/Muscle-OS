package fr.vaeloria.villageois;

import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * Villageois de VÆLORIA : livres de bibliothécaire tirés dans une table configurable, boosts payés en émeraudes
 * qui rendent les livres rares plus fréquents, œuf de capture qui remet les échanges à zéro, change d'émeraudes.
 */
public final class VaeloriaVillageoisPlugin extends JavaPlugin {
    private volatile Settings settings;
    private Bank bank;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        settings = Settings.load(getConfig(), getLogger());
        bank = Bank.create(this);

        Keys keys = new Keys(this);
        WearTracker wear = new WearTracker(keys, this::settings);
        Boosts boosts = new Boosts(keys, this::settings, wear);
        Capture capture = new Capture(keys);
        var pm = getServer().getPluginManager();
        pm.registerEvents(new TradeListener(this, this::settings, boosts, wear), this);
        pm.registerEvents(new CaptureListener(capture, this::settings), this);
        pm.registerEvents(new VillagerListener(wear, (player, villager) -> new BoostMenu(player, villager, boosts, wear, this::settings)), this);
        pm.registerEvents(new MenuListener(), this);

        Commands commands = new Commands(this, this::settings, capture);
        for (String name : new String[]{"villageois", "emeraudes"}) {
            PluginCommand c = getCommand(name);
            if (c != null) {
                c.setExecutor(commands);
                c.setTabCompleter(commands);
            }
        }
        getLogger().info(settings.table().offers().size() + " livres en " + settings.table().tiers().size() + " paliers, boost " + settings.boostCost().forBoost(0) + " émeraudes, usure " + (settings.wear().enabled() ? settings.wear().min() + " à " + settings.wear().max() + " livres" : "désactivée") + ", change "
                + (settings.exchangeEnabled() && bank != null ? settings.buyPrice() + " / " + settings.sellPrice() : "désactivé") + ".");
    }

    Settings settings() {
        return settings;
    }

    Bank bank() {
        return bank;
    }

    /** Recharge config.yml ; en cas d'erreur l'ancienne configuration reste active. */
    void reload() {
        reloadConfig();
        settings = Settings.load(getConfig(), getLogger());
    }
}
