package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Items;
import fr.vaeloria.staff.util.YamlFiles;
import org.bukkit.GameMode;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;

/**
 * Mode staff : l'inventaire du joueur est mis de côté (et écrit dans staffmode.yml pour survivre à un plantage),
 * remplacé par les outils de modération ; vol, invulnérabilité et invisibilité activés.
 */
public final class StaffMode {
    public enum Tool {
        RANDOM_TP(0, Material.COMPASS, "&bTéléportation aléatoire", "&7Clic droit : vers un joueur au hasard"),
        INSPECT(1, Material.BOOK, "&eInspecter", "&7Clic droit sur un joueur : sa fiche"),
        FREEZE(2, Material.PACKED_ICE, "&bImmobiliser", "&7Clic droit sur un joueur"),
        INVSEE(3, Material.CHEST, "&6Inventaire", "&7Clic droit sur un joueur"),
        VANISH(6, Material.LIME_DYE, "&aInvisibilité", "&7Clic droit : activer / désactiver"),
        PLAYERS(7, Material.PLAYER_HEAD, "&fJoueurs connectés", "&7Clic droit : liste"),
        MENU(8, Material.NETHER_STAR, "&6&lMenu staff", "&7Clic droit : /staff");

        final int slot;
        final Material material;
        final String name;
        final String lore;

        Tool(int slot, Material material, String name, String lore) {
            this.slot = slot;
            this.material = material;
            this.name = name;
            this.lore = lore;
        }
    }

    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final NamespacedKey toolKey;
    private final YamlConfiguration saved;

    public StaffMode(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "staffmode.yml");
        this.toolKey = new NamespacedKey(plugin, "staff_tool");
        this.saved = YamlConfiguration.loadConfiguration(file);
    }

    public boolean is(Player p) {
        return saved.contains(p.getUniqueId().toString());
    }

    public void toggle(Player p) {
        if (is(p)) exit(p);
        else enter(p);
    }

    public void enter(Player p) {
        String base = p.getUniqueId().toString();
        ConfigurationSection s = saved.createSection(base);
        List<String> items = new ArrayList<>();
        for (ItemStack item : p.getInventory().getContents()) items.add(Items.isEmpty(item) ? "" : Items.encode(item));
        s.set("name", p.getName());
        s.set("inventory", items);
        s.set("gamemode", p.getGameMode().name());
        s.set("allow-flight", p.getAllowFlight());
        s.set("level", p.getLevel());
        s.set("exp", (double) p.getExp());
        YamlFiles.save(saved, file, plugin.getLogger());

        p.getInventory().clear();
        GameMode mode;
        try {
            mode = GameMode.valueOf(plugin.getConfig().getString("staff-mode.gamemode", "SURVIVAL").toUpperCase());
        } catch (IllegalArgumentException e) {
            mode = GameMode.SURVIVAL;
        }
        p.setGameMode(mode);
        p.setAllowFlight(true);
        p.setFlying(true);
        p.setInvulnerable(true);
        giveTools(p);
        if (plugin.getConfig().getBoolean("staff-mode.auto-vanish", true) && !plugin.vanish().is(p)) plugin.vanish().set(p, true);
        plugin.msg(p, "Mode staff &aactivé&7. Ton inventaire est mis de côté.");
        plugin.notifyStaff(p.getName() + " est passé en mode staff");
    }

    public void exit(Player p) {
        restore(p);
        if (plugin.getConfig().getBoolean("staff-mode.auto-vanish", true) && plugin.vanish().is(p)) plugin.vanish().set(p, false);
        plugin.msg(p, "Mode staff &cdésactivé&7. Inventaire rendu.");
    }

    /** Rend l'inventaire et l'état d'avant le mode staff (aussi à la connexion après un plantage). */
    public void restore(Player p) {
        String base = p.getUniqueId().toString();
        ConfigurationSection s = saved.getConfigurationSection(base);
        if (s == null) return;
        p.getInventory().clear();
        List<String> items = s.getStringList("inventory");
        ItemStack[] contents = new ItemStack[p.getInventory().getSize()];
        for (int i = 0; i < items.size() && i < contents.length; i++) {
            if (items.get(i).isEmpty()) continue;
            try {
                contents[i] = Items.decode(items.get(i));
            } catch (RuntimeException e) {
                plugin.getLogger().log(Level.SEVERE, "Objet illisible dans staffmode.yml (" + p.getName() + ", case " + i + ")", e);
            }
        }
        p.getInventory().setContents(contents);
        GameMode mode = GameMode.valueOf(s.getString("gamemode", "SURVIVAL"));
        p.setGameMode(mode);
        boolean flight = s.getBoolean("allow-flight") || mode == GameMode.CREATIVE || mode == GameMode.SPECTATOR;
        p.setAllowFlight(flight);
        if (!flight) p.setFlying(false);
        p.setLevel(s.getInt("level"));
        p.setExp((float) s.getDouble("exp"));
        p.setInvulnerable(false);
        saved.set(base, null);
        YamlFiles.save(saved, file, plugin.getLogger());
    }

    public void giveTools(Player p) {
        for (Tool tool : Tool.values()) p.getInventory().setItem(tool.slot, toolItem(p, tool));
    }

    private ItemStack toolItem(Player p, Tool tool) {
        Material material = tool == Tool.VANISH && !plugin.vanish().is(p) ? Material.GRAY_DYE : tool.material;
        ItemStack item = Items.icon(material, tool.name, tool.lore);
        ItemMeta meta = item.getItemMeta();
        meta.getPersistentDataContainer().set(toolKey, PersistentDataType.STRING, tool.name());
        item.setItemMeta(meta);
        return item;
    }

    /** L'outil de mode staff tenu, ou {@code null}. */
    public Tool toolOf(ItemStack item) {
        if (Items.isEmpty(item) || !item.hasItemMeta()) return null;
        String name = item.getItemMeta().getPersistentDataContainer().get(toolKey, PersistentDataType.STRING);
        if (name == null) return null;
        try {
            return Tool.valueOf(name);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** Arrêt du serveur : tout le monde récupère son inventaire. */
    public void restoreAll() {
        for (String key : new ArrayList<>(saved.getKeys(false))) {
            Player p = plugin.getServer().getPlayer(UUID.fromString(key));
            if (p != null) restore(p);
        }
    }

    public List<UUID> active() {
        List<UUID> out = new ArrayList<>();
        for (String key : saved.getKeys(false)) out.add(UUID.fromString(key));
        return out;
    }
}
