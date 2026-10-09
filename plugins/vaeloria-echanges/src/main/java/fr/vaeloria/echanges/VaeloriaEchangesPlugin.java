package fr.vaeloria.echanges;

import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * VaeloriaEchanges : livres enchantés des bibliothécaires tirés à la chance, boost payé en émeraudes,
 * capture des villageois à l'œuf. Toute l'économie du plugin est en émeraudes (aucune dépendance à Vault).
 */
public final class VaeloriaEchangesPlugin extends JavaPlugin {
    private Settings settings;
    private Keys keys;
    private Trades trades;
    private Items items;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        keys = new Keys(this);
        settings = Settings.load(getConfig(), getLogger());
        trades = new Trades(this);
        items = new Items(this);
        getServer().getPluginManager().registerEvents(new TradeListener(this), this);
        getServer().getPluginManager().registerEvents(new BoostListener(this), this);
        getServer().getPluginManager().registerEvents(new CaptureListener(this), this);
        EchangesCommand command = new EchangesCommand(this);
        PluginCommand cmd = getCommand("echanges");
        cmd.setExecutor(command);
        cmd.setTabCompleter(command);
        getLogger().info(settings.table().offers().size() + " livres dans la table des bibliothécaires.");
    }

    public void reload() {
        reloadConfig();
        settings = Settings.load(getConfig(), getLogger());
    }

    public Settings settings() { return settings; }
    public Keys keys() { return keys; }
    public Trades trades() { return trades; }
    public Items items() { return items; }

    public void msg(CommandSender to, String text) {
        to.sendMessage(Text.of(settings.prefix() + text));
    }
}
