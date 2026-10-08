package fr.vaeloria.mines;

import fr.vaeloria.mines.gui.ChatPrompts;
import fr.vaeloria.mines.gui.Menu;
import fr.vaeloria.mines.gui.MenuListener;
import fr.vaeloria.mines.model.BlockPos;
import fr.vaeloria.mines.model.Countdown;
import fr.vaeloria.mines.model.Cuboid;
import fr.vaeloria.mines.model.Durations;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.model.Spot;
import fr.vaeloria.mines.util.Items;
import fr.vaeloria.mines.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * VaeloriaMines : mines régénérées automatiquement.
 * Les admins délimitent une zone (baguette ou /mine pos1·pos2), choisissent les blocs (ex. 100 % obsidienne)
 * et le délai (ex. 15 min) via /mine admin ; la zone est remplie à nouveau à chaque échéance, avec annonces
 * (« la mine d'obsidienne se réinitialise dans 15 minutes »), barre de boss et hologramme.
 */
public final class VaeloriaMinesPlugin extends JavaPlugin {
    private MineManager mines;
    private MineResetter resetter;
    private MineDisplays displays;
    private ChatPrompts prompts;
    private NamespacedKey wandKey;
    private long[] warnings = new long[0];
    private final Map<UUID, BlockPos> pos1 = new HashMap<>();
    private final Map<UUID, BlockPos> pos2 = new HashMap<>();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        loadSettings();
        wandKey = new NamespacedKey(this, "mine_wand");
        mines = new MineManager(new File(getDataFolder(), "mines.yml"), getLogger());
        mines.load();
        resetter = new MineResetter(this);
        displays = new MineDisplays(this);
        prompts = new ChatPrompts(this);
        getServer().getPluginManager().registerEvents(new MenuListener(), this);
        getServer().getPluginManager().registerEvents(prompts, this);
        getServer().getPluginManager().registerEvents(new MineListener(this), this);
        MineCommand command = new MineCommand(this);
        PluginCommand cmd = getCommand("mine");
        cmd.setExecutor(command);
        cmd.setTabCompleter(command);
        Bukkit.getScheduler().runTaskTimer(this, this::tick, 20L, 20L);
    }

    @Override
    public void onDisable() {
        // Une mine à moitié remplie ne doit pas rester en l'état : on termine les réinitialisations en cours.
        if (resetter != null) resetter.finishAll();
        if (displays != null) displays.clear();
        closeMenus();
        if (mines != null) mines.save();
    }

    /** Recharge config.yml et mines.yml. Refusé pendant une réinitialisation. */
    public boolean reload() {
        if (resetter.running()) return false;
        closeMenus();
        displays.clear();
        reloadConfig();
        loadSettings();
        mines.load();
        return true;
    }

    private void loadSettings() {
        List<Long> list = getConfig().getLongList("warnings");
        warnings = list.stream().mapToLong(Long::longValue).filter(s -> s > 0).toArray();
    }

    private void closeMenus() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (p.getOpenInventory().getTopInventory().getHolder(false) instanceof Menu) p.closeInventory();
        }
    }

    /** Chaque seconde : comptes à rebours, annonces, réinitialisations, affichages. */
    private void tick() {
        long now = System.currentTimeMillis();
        for (Mine mine : List.copyOf(mines.all())) {
            if (!mine.ready() || mine.paused() || mine.resetting()) continue;
            long remaining = mine.remainingSeconds(now);
            long crossed = Countdown.crossed(warnings, mine.lastRemaining(), remaining);
            mine.lastRemaining(remaining);
            if (remaining <= 0) {
                String error = resetter.start(mine, MineResetter.Cause.TIMER);
                if (error != null) {
                    // Monde absent, blocs invalides… : on retente au prochain délai plutôt qu'à chaque seconde.
                    getLogger().warning("Mine " + mine.id() + " non réinitialisée : " + error);
                    mine.restartTimer(now);
                    mines.save();
                }
            } else if (crossed > 0 && mine.announce()) {
                announce(mine, getConfig().getString("messages.warning", "{mine} &7se réinitialise dans &e{time}&7 !"), crossed);
            }
        }
        displays.tick(now);
        for (Player p : Bukkit.getOnlinePlayers()) {
            if (p.getOpenInventory().getTopInventory().getHolder(false) instanceof Menu menu && menu.live()) menu.redraw();
        }
    }

    // ---- Accès ----

    public MineManager mines() { return mines; }
    public MineResetter resetter() { return resetter; }
    public MineDisplays displays() { return displays; }
    public ChatPrompts prompts() { return prompts; }

    // ---- Messages ----

    public String prefix() {
        return getConfig().getString("prefix", "&6[VÆLORIA] &7");
    }

    public void msg(CommandSender to, String text) {
        to.sendMessage(Text.of(prefix() + text));
    }

    /** Remplace {mine}, {id}, {time}, {clock}. */
    public String fill(String template, Mine mine, long seconds) {
        return template.replace("{mine}", mine.name()).replace("{id}", mine.id())
                .replace("{time}", Durations.format(seconds)).replace("{clock}", Durations.clock(seconds));
    }

    /** État affiché par la barre de boss (format court) et l'hologramme (format long). */
    public String state(Mine mine, long now, boolean shortClock) {
        String key;
        if (!mine.ready()) key = "unready";
        else if (mine.resetting()) key = "resetting";
        else if (mine.paused()) key = "paused";
        else key = shortClock ? "countdown-short" : "countdown";
        return fill(getConfig().getString("states." + key, ""), mine, mine.remainingSeconds(now));
    }

    /** Annonce selon announce.scope : tout le serveur, le monde de la mine ou les joueurs proches. */
    public void announce(Mine mine, String template, long seconds) {
        Component line = Text.of(prefix() + fill(template, mine, seconds));
        String scope = getConfig().getString("announce.scope", "server").toLowerCase(Locale.ROOT);
        if (scope.equals("server") || mine.region() == null) {
            Bukkit.broadcast(line);
            return;
        }
        Cuboid r = mine.region();
        int radius = getConfig().getInt("announce.radius", 150);
        for (Player p : Bukkit.getOnlinePlayers()) {
            Location l = p.getLocation();
            boolean near = scope.equals("world") ? l.getWorld().getName().equals(r.world())
                    : r.contains(l.getWorld().getName(), l.getBlockX(), l.getBlockY(), l.getBlockZ(), radius);
            if (near) p.sendMessage(line);
        }
        Bukkit.getConsoleSender().sendMessage(line);
    }

    // ---- Sélection de zone ----

    public void pos1(Player p, BlockPos pos) { pos1.put(p.getUniqueId(), pos); }
    public void pos2(Player p, BlockPos pos) { pos2.put(p.getUniqueId(), pos); }

    public void forgetSelection(Player p) {
        pos1.remove(p.getUniqueId());
        pos2.remove(p.getUniqueId());
    }

    /** Zone entre les deux coins choisis, ou null (coin manquant, mondes différents). */
    public Cuboid selection(Player p) {
        BlockPos a = pos1.get(p.getUniqueId()), b = pos2.get(p.getUniqueId());
        if (a == null || b == null || !a.world().equals(b.world())) return null;
        return Cuboid.of(a, b);
    }

    /** Message après le choix d'un coin : coordonnées + taille si la sélection est complète. */
    public void selectionFeedback(Player p, int corner, BlockPos pos) {
        Cuboid sel = selection(p);
        msg(p, "Coin " + corner + " : &f" + pos + (sel != null ? " &8(" + sel.sizeX() + "×" + sel.sizeY() + "×" + sel.sizeZ()
                + " = " + sel.volume() + " blocs)" : ""));
    }

    // ---- Baguette ----

    public ItemStack wand() {
        ItemStack wand = Items.icon(Material.BLAZE_ROD, "&6Baguette de mine",
                "&7Clic gauche sur un bloc : &fcoin 1",
                "&7Clic droit sur un bloc : &fcoin 2",
                "&7Puis &f/mine admin &7→ mine → &fZone");
        ItemMeta meta = wand.getItemMeta();
        meta.getPersistentDataContainer().set(wandKey, PersistentDataType.BYTE, (byte) 1);
        wand.setItemMeta(meta);
        return wand;
    }

    public boolean isWand(ItemStack item) {
        if (Items.isEmpty(item) || !item.hasItemMeta()) return false;
        return item.getItemMeta().getPersistentDataContainer().has(wandKey, PersistentDataType.BYTE);
    }

    public void giveWand(Player p) {
        for (ItemStack left : p.getInventory().addItem(wand()).values()) p.getWorld().dropItem(p.getLocation(), left);
        msg(p, "Baguette reçue : &fclic gauche &7= coin 1, &fclic droit &7= coin 2.");
    }

    // ---- Positions ----

    public static BlockPos blockPos(Location l) {
        return new BlockPos(l.getWorld().getName(), l.getBlockX(), l.getBlockY(), l.getBlockZ());
    }

    public static Spot spot(Location l) {
        return new Spot(l.getWorld().getName(), l.getX(), l.getY(), l.getZ(), l.getYaw(), l.getPitch());
    }

    /** Location d'un point sauvegardé, ou null si le monde n'est pas chargé. */
    public static Location location(Spot s) {
        World w = s == null ? null : Bukkit.getWorld(s.world());
        return w == null ? null : new Location(w, s.x(), s.y(), s.z(), s.yaw(), s.pitch());
    }

    /** Point d'arrivée : celui de l'admin, sinon le dessus du centre de la zone. */
    public Location arrival(Mine mine) {
        Location spawn = location(mine.spawn());
        if (spawn != null || mine.region() == null) return spawn;
        Cuboid r = mine.region();
        World w = Bukkit.getWorld(r.world());
        if (w == null) return null;
        return new Location(w, (r.minX() + r.maxX() + 1) / 2.0, r.maxY() + 1, (r.minZ() + r.maxZ() + 1) / 2.0);
    }
}
