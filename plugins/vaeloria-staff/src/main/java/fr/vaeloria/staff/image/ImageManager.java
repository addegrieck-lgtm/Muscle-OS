package fr.vaeloria.staff.image;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.util.Ids;
import fr.vaeloria.staff.util.YamlFiles;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.block.BlockFace;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Entity;
import org.bukkit.entity.GlowItemFrame;
import org.bukkit.entity.ItemFrame;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.MapMeta;
import org.bukkit.map.MapPalette;
import org.bukkit.map.MapRenderer;
import org.bukkit.map.MapView;
import org.bukkit.persistence.PersistentDataType;

import java.awt.image.BufferedImage;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.logging.Level;

/**
 * Images HD sur des murs de cadres. Chaque cadre porte une carte dont le contenu est dessiné par le plugin.
 * Les pixels convertis sont gardés dans walls/<id>.bin et ré-attachés aux cartes à chaque démarrage ;
 * les cadres, eux, sont de vraies entités du monde (fixes, invisibles, incassables).
 */
public final class ImageManager {
    private final VaeloriaStaffPlugin plugin;
    private final File file;
    private final File imagesDir;
    private final File wallsDir;
    private final NamespacedKey tag;
    private final Map<String, ImageWall> walls = new LinkedHashMap<>();
    private int[] palette;

    public ImageManager(VaeloriaStaffPlugin plugin) {
        this.plugin = plugin;
        this.file = new File(plugin.getDataFolder(), "images.yml");
        this.imagesDir = new File(plugin.getDataFolder(), "images");
        this.wallsDir = new File(plugin.getDataFolder(), "walls");
        this.tag = new NamespacedKey(plugin, "image_wall");
        imagesDir.mkdirs();
        wallsDir.mkdirs();
    }

    public Collection<ImageWall> all() { return walls.values(); }
    public ImageWall get(String id) { return id == null ? null : walls.get(id.toLowerCase()); }
    public List<String> ids() { return new ArrayList<>(walls.keySet()); }
    public File imagesDir() { return imagesDir; }

    /** Fichiers images déposés dans plugins/VaeloriaStaff/images/. */
    public List<String> files() {
        String[] names = imagesDir.list((dir, name) -> name.toLowerCase().matches(".*\\.(png|jpe?g|gif|bmp)"));
        List<String> out = names == null ? new ArrayList<>() : new ArrayList<>(List.of(names));
        out.sort(String.CASE_INSENSITIVE_ORDER);
        return out;
    }

    public String idOf(Entity e) {
        return e.getPersistentDataContainer().get(tag, PersistentDataType.STRING);
    }

    public int maxTiles() {
        return Math.max(1, plugin.getConfig().getInt("images.max-frames", 64));
    }

    /** Charge l'image hors du thread principal ; {@code done} reçoit l'image (ou l'erreur) sur le thread principal. */
    public void loadAsync(String source, Consumer<BufferedImage> done, Consumer<String> error) {
        long maxBytes = plugin.getConfig().getLong("images.max-download-mb", 15) * 1_048_576L;
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            try {
                BufferedImage image = ImageLoader.read(source, imagesDir, maxBytes);
                Bukkit.getScheduler().runTask(plugin, () -> done.accept(image));
            } catch (IOException | RuntimeException e) {
                String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                Bukkit.getScheduler().runTask(plugin, () -> error.accept(message));
            }
        });
    }

    /**
     * Vérifie qu'on peut poser {@code cols × rows} cadres sur ce mur.
     * @return {@code null} si c'est possible, sinon le problème à afficher.
     */
    public String check(Block origin, BlockFace face, int cols, int rows) {
        if (face != BlockFace.NORTH && face != BlockFace.SOUTH && face != BlockFace.EAST && face != BlockFace.WEST) {
            return "Clique la face verticale d'un mur (pas le sol ni le plafond).";
        }
        ImageWall probe = new ImageWall("", "", origin.getWorld().getName(), origin.getX(), origin.getY(), origin.getZ(), face, cols, rows);
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                int[] s = probe.support(col, row);
                Block support = origin.getWorld().getBlockAt(s[0], s[1], s[2]);
                Block front = support.getRelative(face);
                String where = " (" + s[0] + " " + s[1] + " " + s[2] + ")";
                if (!support.getType().isSolid()) return "Le mur doit être plein sur " + cols + "×" + rows + " blocs : trou" + where + ".";
                if (!front.isPassable()) return "Un bloc gêne devant le mur" + where + ".";
                if (!front.getWorld().getNearbyEntities(front.getLocation().add(0.5, 0.5, 0.5), 0.5, 0.5, 0.5,
                        e -> e instanceof ItemFrame).isEmpty()) return "Il y a déjà un cadre devant le mur" + where + ".";
            }
        }
        return null;
    }

    /**
     * Convertit l'image (hors thread principal) puis pose les cadres. {@code done} reçoit le mur créé,
     * {@code error} le message d'erreur ; les deux sur le thread principal.
     */
    public void place(String name, String source, BufferedImage image, Block origin, BlockFace face, int cols, int rows,
                      boolean dither, Consumer<ImageWall> done, Consumer<String> error) {
        int[] colors = palette();
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            byte[][] tiles;
            try {
                BufferedImage fitted = ImageLoader.fit(image, cols * 128, rows * 128);
                tiles = ImageLoader.tiles(fitted, cols, rows, colors, 4, dither);
            } catch (RuntimeException e) {
                plugin.getLogger().log(Level.WARNING, "Conversion d'image impossible", e);
                Bukkit.getScheduler().runTask(plugin, () -> error.accept("Conversion impossible : " + e.getMessage()));
                return;
            }
            Bukkit.getScheduler().runTask(plugin, () -> {
                String problem = check(origin, face, cols, rows); // le monde a pu changer pendant la conversion
                if (problem != null) {
                    error.accept(problem);
                    return;
                }
                String id = Ids.unique(name, "image", walls::containsKey);
                ImageWall wall = new ImageWall(id, source, origin.getWorld().getName(), origin.getX(), origin.getY(), origin.getZ(), face, cols, rows);
                try {
                    writeTiles(wall, tiles);
                } catch (IOException e) {
                    plugin.getLogger().log(Level.SEVERE, "Impossible d'enregistrer l'image " + id, e);
                    error.accept("Impossible d'enregistrer l'image sur le disque.");
                    return;
                }
                boolean glow = plugin.getConfig().getBoolean("images.glow-frames", true);
                for (int row = 0; row < rows; row++) {
                    for (int col = 0; col < cols; col++) {
                        MapView view = Bukkit.createMap(origin.getWorld());
                        attach(view, tiles[row * cols + col]);
                        wall.maps().add(view.getId());
                        spawnFrame(wall, col, row, view, glow);
                    }
                }
                walls.put(id, wall);
                save();
                done.accept(wall);
            });
        });
    }

    private void spawnFrame(ImageWall wall, int col, int row, MapView view, boolean glow) {
        World world = Bukkit.getWorld(wall.world());
        int[] s = wall.support(col, row);
        Block front = world.getBlockAt(s[0], s[1], s[2]).getRelative(wall.face());
        ItemStack map = new ItemStack(Material.FILLED_MAP);
        MapMeta meta = (MapMeta) map.getItemMeta();
        meta.setMapView(view);
        map.setItemMeta(meta);
        Class<? extends ItemFrame> type = glow ? GlowItemFrame.class : ItemFrame.class;
        world.spawn(front.getLocation(), type, frame -> {
            frame.setFacingDirection(wall.face(), true);
            frame.setItem(map, false);
            frame.setVisible(false);
            frame.setFixed(true);
            frame.setInvulnerable(true);
            frame.getPersistentDataContainer().set(tag, PersistentDataType.STRING, wall.id());
        });
    }

    private static void attach(MapView view, byte[] pixels) {
        for (MapRenderer r : view.getRenderers()) view.removeRenderer(r);
        view.setTrackingPosition(false);
        view.setUnlimitedTracking(false);
        view.setLocked(true);
        view.addRenderer(new ImageRenderer(pixels));
    }

    /** Retire les cadres du monde et efface les cartes. */
    public void delete(ImageWall wall) {
        World world = Bukkit.getWorld(wall.world());
        if (world != null) {
            for (int row = 0; row < wall.rows(); row++) {
                for (int col = 0; col < wall.cols(); col++) {
                    int[] s = wall.support(col, row);
                    Location center = world.getBlockAt(s[0], s[1], s[2]).getRelative(wall.face()).getLocation().add(0.5, 0.5, 0.5);
                    center.getChunk().load();
                    for (Entity e : world.getNearbyEntities(center, 0.6, 0.6, 0.6, x -> wall.id().equals(idOf(x)))) e.remove();
                }
            }
        }
        for (int mapId : wall.maps()) {
            @SuppressWarnings("deprecation") MapView view = Bukkit.getMap(mapId);
            if (view != null) for (MapRenderer r : view.getRenderers()) view.removeRenderer(r);
        }
        walls.remove(wall.id());
        new File(wallsDir, wall.id() + ".bin").delete();
        save();
    }

    public Location location(ImageWall wall) {
        World world = Bukkit.getWorld(wall.world());
        if (world == null) return null;
        Block front = world.getBlockAt(wall.x(), wall.y(), wall.z()).getRelative(wall.face());
        Location at = front.getLocation().add(0.5, 0, 0.5);
        int[] r = ImageWall.right(wall.face());
        at.add(r[0] * (wall.cols() - 1) / 2.0, 0, r[1] * (wall.cols() - 1) / 2.0);
        at.add(wall.face().getModX() * 2.5, 0, wall.face().getModZ() * 2.5);
        at.setDirection(wall.face().getOppositeFace().getDirection());
        return at;
    }

    /** Palette des cartes (≈ 240 couleurs), lue une fois depuis le serveur. */
    @SuppressWarnings("deprecation")
    private int[] palette() {
        if (palette != null) return palette;
        List<Integer> colors = new ArrayList<>();
        for (int i = 4; i < 256; i++) {
            try {
                java.awt.Color c = MapPalette.getColor((byte) i);
                if (c.getAlpha() < 255) break;
                colors.add(c.getRGB() & 0xFFFFFF);
            } catch (RuntimeException e) {
                break;
            }
        }
        palette = colors.stream().mapToInt(Integer::intValue).toArray();
        return palette;
    }

    // ---- Persistance ----

    private void writeTiles(ImageWall wall, byte[][] tiles) throws IOException {
        File tmp = new File(wallsDir, wall.id() + ".bin.tmp");
        try (DataOutputStream out = new DataOutputStream(new FileOutputStream(tmp))) {
            out.writeInt(tiles.length);
            for (byte[] t : tiles) out.write(t);
        }
        File target = new File(wallsDir, wall.id() + ".bin");
        if (!tmp.renameTo(target)) {
            target.delete();
            if (!tmp.renameTo(target)) throw new IOException("renommage impossible");
        }
    }

    private byte[][] readTiles(ImageWall wall) throws IOException {
        try (DataInputStream in = new DataInputStream(new FileInputStream(new File(wallsDir, wall.id() + ".bin")))) {
            int n = in.readInt();
            if (n != wall.cols() * wall.rows()) throw new IOException("nombre de tuiles incohérent");
            byte[][] tiles = new byte[n][128 * 128];
            for (byte[] t : tiles) in.readFully(t);
            return tiles;
        }
    }

    @SuppressWarnings("deprecation")
    public void load() {
        walls.clear();
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yml.getConfigurationSection("walls");
        if (root != null) {
            for (String id : root.getKeys(false)) {
                ConfigurationSection s = root.getConfigurationSection(id);
                try {
                    ImageWall wall = new ImageWall(id, s.getString("source", "?"), s.getString("world"),
                            s.getInt("x"), s.getInt("y"), s.getInt("z"), BlockFace.valueOf(s.getString("face")),
                            s.getInt("cols"), s.getInt("rows"));
                    wall.maps().addAll(s.getIntegerList("maps"));
                    byte[][] tiles = readTiles(wall);
                    for (int i = 0; i < wall.maps().size() && i < tiles.length; i++) {
                        MapView view = Bukkit.getMap(wall.maps().get(i));
                        if (view != null) attach(view, tiles[i]);
                    }
                    walls.put(id, wall);
                } catch (IOException | RuntimeException e) {
                    plugin.getLogger().log(Level.WARNING, "Image illisible ignorée : " + id, e);
                }
            }
        }
        plugin.getLogger().info(walls.size() + " image(s) chargée(s)");
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of("Images VaeloriaStaff — posées en jeu avec /staff → Images.",
                "Les pixels sont dans walls/<id>.bin. Ne pas modifier « maps » à la main."));
        for (ImageWall w : walls.values()) {
            ConfigurationSection s = yml.createSection("walls." + w.id());
            s.set("source", w.source());
            s.set("world", w.world());
            s.set("x", w.x());
            s.set("y", w.y());
            s.set("z", w.z());
            s.set("face", w.face().name());
            s.set("cols", w.cols());
            s.set("rows", w.rows());
            s.set("maps", new ArrayList<>(w.maps()));
        }
        YamlFiles.save(yml, file, plugin.getLogger());
    }

    /** Admin en train de choisir le mur : on garde l'image chargée et la taille voulue. */
    public record Pending(String name, String source, BufferedImage image, int cols, int rows, boolean dither) {}
}
