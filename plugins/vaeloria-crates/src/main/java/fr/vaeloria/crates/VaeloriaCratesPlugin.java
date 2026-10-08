package fr.vaeloria.crates;

import fr.vaeloria.crates.gui.ChatPrompts;
import fr.vaeloria.crates.gui.Menu;
import fr.vaeloria.crates.gui.MenuListener;
import fr.vaeloria.crates.gui.RollAnimation;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.util.Text;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextReplacementConfig;
import org.bukkit.Bukkit;
import org.bukkit.NamespacedKey;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * VaeloriaCrates : coffres à clés configurables en jeu.
 * Les admins créent les coffres, dessinent leurs clés et déposent leurs propres lots via /crate admin ;
 * la boutique (VæloriaBridge) distribue les clés avec /crate give {player} <coffre> <nombre>.
 */
public final class VaeloriaCratesPlugin extends JavaPlugin {
    private CrateManager crates;
    private ChatPrompts prompts;
    private final Map<UUID, RollAnimation> rolling = new HashMap<>();
    /** Admins en train de choisir un bloc à lier : joueur → id du coffre. */
    private final Map<UUID, String> binding = new HashMap<>();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        crates = new CrateManager(new File(getDataFolder(), "crates.yml"), getLogger(), new NamespacedKey(this, "crate_key"));
        crates.load();
        prompts = new ChatPrompts(this);
        getServer().getPluginManager().registerEvents(new MenuListener(), this);
        getServer().getPluginManager().registerEvents(prompts, this);
        getServer().getPluginManager().registerEvents(new CrateListener(this), this);
        CrateCommand command = new CrateCommand(this);
        PluginCommand cmd = getCommand("crate");
        cmd.setExecutor(command);
        cmd.setTabCompleter(command);
    }

    @Override
    public void onDisable() {
        // Aucune clé consommée ne doit être perdue : on termine les ouvertures en cours.
        for (RollAnimation roll : new ArrayList<>(rolling.values())) roll.finish();
        closeMenus();
    }

    public void reload() {
        closeMenus();
        reloadConfig();
        crates.load();
    }

    private void closeMenus() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (p.getOpenInventory().getTopInventory().getHolder(false) instanceof Menu) p.closeInventory();
        }
    }

    public CrateManager crates() { return crates; }
    public ChatPrompts prompts() { return prompts; }
    public Map<UUID, RollAnimation> rolling() { return rolling; }
    public Map<UUID, String> binding() { return binding; }

    public void msg(CommandSender to, String text) {
        to.sendMessage(Text.of(getConfig().getString("prefix", "&6[VÆLORIA] &7") + text));
    }

    /** Donne des clés (en plusieurs piles si l'apparence choisie ne s'empile pas) ; le surplus tombe au sol. */
    public void giveKeys(Player target, Crate crate, int amount) {
        int left = amount;
        while (left > 0) {
            ItemStack keys = crates.keys(crate, left);
            left -= keys.getAmount();
            for (ItemStack overflow : target.getInventory().addItem(keys).values()) {
                target.getWorld().dropItem(target.getLocation(), overflow);
            }
        }
        msg(target, "Tu as reçu &f" + amount + " &7clé(s) " + crate.name() + "&7.");
    }

    /** Remet un lot au joueur : objet (le surplus tombe au sol), commandes console, annonce. */
    public void grant(Player player, Crate crate, Reward reward) {
        if (reward.giveItem()) {
            ItemStack item = reward.item();
            for (ItemStack left : player.getInventory().addItem(item).values()) {
                player.getWorld().dropItem(player.getLocation(), left);
            }
        }
        for (String command : reward.commands()) {
            String c = command.replace("{player}", player.getName()).replace("{uuid}", player.getUniqueId().toString());
            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
        }
        Component itemName = reward.item().displayName();
        player.sendMessage(Text.of(getConfig().getString("prefix", "&6[VÆLORIA] &7") + "Tu as obtenu ").append(itemName).append(Text.of(" &7!")));
        if (reward.broadcast()) {
            Component line = Text.of(getConfig().getString("broadcast-format", "&e{player} &7a obtenu &f{item} &7!")
                            .replace("{player}", player.getName())
                            .replace("{crate}", crate.name()))
                    .replaceText(TextReplacementConfig.builder().matchLiteral("{item}").replacement(itemName).build());
            Bukkit.broadcast(line);
        }
        getLogger().info(player.getName() + " a obtenu " + Text.plain(itemName) + " x" + reward.item().getAmount()
                + " (coffre " + crate.id() + ")");
    }
}
