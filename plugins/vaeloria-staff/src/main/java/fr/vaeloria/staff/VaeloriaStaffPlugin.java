package fr.vaeloria.staff;

import fr.vaeloria.staff.broadcast.Broadcast;
import fr.vaeloria.staff.broadcast.BroadcastManager;
import fr.vaeloria.staff.broadcast.BroadcastType;
import fr.vaeloria.staff.gui.ChatPrompts;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.MenuListener;
import fr.vaeloria.staff.hologram.HologramManager;
import fr.vaeloria.staff.image.ImageListener;
import fr.vaeloria.staff.image.ImageManager;
import fr.vaeloria.staff.moderation.ChatControl;
import fr.vaeloria.staff.moderation.Freeze;
import fr.vaeloria.staff.moderation.ModerationListener;
import fr.vaeloria.staff.moderation.Mutes;
import fr.vaeloria.staff.moderation.Sanctions;
import fr.vaeloria.staff.moderation.StaffMode;
import fr.vaeloria.staff.moderation.Vanish;
import fr.vaeloria.staff.npc.NpcListener;
import fr.vaeloria.staff.npc.NpcManager;
import fr.vaeloria.staff.util.Text;
import org.bukkit.Bukkit;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * VaeloriaStaff : tout le staff dans /staff.
 * Contenu (annonces, pancartes, PNJ, images HD sur cadres) configurable en jeu,
 * et modération (mode staff, invisibilité, freeze, inventaires, sanctions, chat staff).
 */
public final class VaeloriaStaffPlugin extends JavaPlugin {
    private ChatPrompts prompts;
    private BroadcastManager broadcasts;
    private HologramManager holograms;
    private NpcManager npcs;
    private ImageManager images;
    private Vanish vanish;
    private Freeze freeze;
    private Mutes mutes;
    private Sanctions sanctions;
    private StaffMode staffMode;
    private ChatControl chat;
    private final Map<UUID, ImageManager.Pending> pendingImages = new ConcurrentHashMap<>();
    /** Joueurs qui regardent un inventaire en lecture seule. */
    private final Set<UUID> readOnly = ConcurrentHashMap.newKeySet();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        prompts = new ChatPrompts(this);
        broadcasts = new BroadcastManager(this);
        holograms = new HologramManager(this);
        npcs = new NpcManager(this);
        images = new ImageManager(this);
        vanish = new Vanish(this);
        freeze = new Freeze(this);
        mutes = new Mutes(this);
        sanctions = new Sanctions(this);
        staffMode = new StaffMode(this);
        chat = new ChatControl(this);
        loadData();

        var pm = getServer().getPluginManager();
        pm.registerEvents(new MenuListener(), this);
        pm.registerEvents(prompts, this);
        pm.registerEvents(new NpcListener(this), this);
        pm.registerEvents(new ImageListener(this), this);
        pm.registerEvents(new ModerationListener(this), this);

        StaffCommand command = new StaffCommand(this);
        for (String name : List.of("staff", "sc")) {
            PluginCommand cmd = getCommand(name);
            cmd.setExecutor(command);
            cmd.setTabCompleter(command);
        }

        broadcasts.start();
        // Pancartes et PNJ : (re)création quand leur chunk est chargé, mise à jour des variables.
        Bukkit.getScheduler().runTaskTimer(this, () -> {
            holograms.tick();
            npcs.tick();
        }, 20L, 40L);
        // /reload ou plugin rechargé : les joueurs déjà connectés.
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (staffMode.is(p)) staffMode.restore(p);
        }
    }

    @Override
    public void onDisable() {
        closeMenus();
        if (staffMode != null) staffMode.restoreAll();
        if (vanish != null) vanish.showAll();
        if (broadcasts != null) broadcasts.stop();
        if (holograms != null) holograms.despawnAll();
        if (npcs != null) npcs.despawnAll();
    }

    private void loadData() {
        broadcasts.load();
        holograms.load();
        npcs.load();
        images.load();
        mutes.load();
    }

    public void reload() {
        closeMenus();
        reloadConfig();
        loadData();
        broadcasts.start();
    }

    private void closeMenus() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (p.getOpenInventory().getTopInventory().getHolder(false) instanceof Menu) p.closeInventory();
        }
    }

    // ---- Accès ----

    public ChatPrompts prompts() { return prompts; }
    public BroadcastManager broadcasts() { return broadcasts; }
    public HologramManager holograms() { return holograms; }
    public NpcManager npcs() { return npcs; }
    public ImageManager images() { return images; }
    public Map<UUID, ImageManager.Pending> pendingImages() { return pendingImages; }
    public Vanish vanish() { return vanish; }
    public Freeze freeze() { return freeze; }
    public Mutes mutes() { return mutes; }
    public Sanctions sanctions() { return sanctions; }
    public StaffMode staffMode() { return staffMode; }
    public ChatControl chat() { return chat; }
    public Set<UUID> readOnly() { return readOnly; }

    // ---- Messages ----

    public String prefix() {
        return getConfig().getString("prefix", "&6[VÆLORIA] &7");
    }

    public void msg(CommandSender to, String text) {
        to.sendMessage(Text.of(prefix() + text));
    }

    /** Message à tout le staff connecté (et à la console). */
    public void notifyStaff(String text) {
        String line = getConfig().getString("staff-notify-prefix", "&8[&6Staff&8] &7") + text;
        for (Player p : Bukkit.getOnlinePlayers()) if (p.hasPermission(Perm.USE)) p.sendMessage(Text.of(line));
        Bukkit.getConsoleSender().sendMessage(Text.of(line));
    }

    // ---- Actions partagées par les menus et la commande ----

    /** Ouvre l'inventaire (ou le coffre de l'Ender) d'un joueur ; en lecture seule sans permission ou en mode staff. */
    public void openInventory(Player viewer, Player target, boolean ender) {
        boolean editable = viewer.hasPermission(Perm.INVSEE_EDIT) && !staffMode.is(viewer);
        viewer.openInventory(ender ? target.getEnderChest() : target.getInventory());
        if (!editable) readOnly.add(viewer.getUniqueId());
        msg(viewer, (ender ? "Coffre de l'Ender" : "Inventaire") + " de &f" + target.getName()
                + (editable ? "" : " &8(lecture seule)"));
    }

    /** Annonce ponctuelle, non enregistrée. {@code text} : lignes séparées par « | ». */
    public void quickBroadcast(BroadcastType type, String text) {
        Broadcast b = new Broadcast("_rapide", "Annonce rapide");
        b.type(type);
        b.lines().addAll(List.of(text.split("\\|")));
        b.seconds(getConfig().getInt("broadcasts.quick-seconds", 6));
        b.sound(getConfig().getString("broadcasts.quick-sound", "block.note_block.pling"));
        broadcasts.send(b);
    }

    public static BroadcastType parseType(String s) {
        return switch (s.toLowerCase(Locale.ROOT)) {
            case "chat" -> BroadcastType.CHAT;
            case "titre", "title" -> BroadcastType.TITLE;
            case "action", "actionbar" -> BroadcastType.ACTIONBAR;
            case "boss", "bossbar" -> BroadcastType.BOSSBAR;
            default -> null;
        };
    }
}
