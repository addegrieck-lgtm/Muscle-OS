package fr.vaeloria.crates;

import fr.vaeloria.crates.model.BlockPos;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.util.Items;
import fr.vaeloria.crates.util.Text;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.block.Block;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Coffres en mémoire + persistance dans crates.yml (réécrit à chaque modification admin).
 *
 * Une clé est authentifiée par un marqueur invisible (PersistentDataContainer « vaeloriacrates:crate_key »)
 * et non par son nom : renommer un objet à l'enclume ne fabrique pas de clé, et changer l'apparence
 * d'une clé dans l'admin n'invalide pas celles déjà distribuées.
 */
public final class CrateManager {
    private final File file;
    private final Logger log;
    private final NamespacedKey keyTag;
    private final Map<String, Crate> crates = new LinkedHashMap<>();
    private final Map<BlockPos, String> byBlock = new HashMap<>();

    public CrateManager(File file, Logger log, NamespacedKey keyTag) {
        this.file = file;
        this.log = log;
        this.keyTag = keyTag;
    }

    // ---- Accès ----

    public Collection<Crate> all() { return crates.values(); }
    public Crate get(String id) { return id == null ? null : crates.get(id.toLowerCase()); }
    public List<String> ids() { return new ArrayList<>(crates.keySet()); }

    public Crate at(Block block) {
        return get(byBlock.get(pos(block)));
    }

    public static BlockPos pos(Block block) {
        return new BlockPos(block.getWorld().getName(), block.getX(), block.getY(), block.getZ());
    }

    // ---- Modifications ----

    public Crate create(String id, String name) {
        Crate crate = new Crate(id, name, defaultKey(name));
        crates.put(id, crate);
        save();
        return crate;
    }

    public void delete(Crate crate) {
        crates.remove(crate.id());
        byBlock.values().removeIf(crate.id()::equals);
        save();
    }

    /** Lie un bloc au coffre (un bloc ne peut appartenir qu'à un seul coffre). */
    public void bind(Crate crate, Block block) {
        BlockPos p = pos(block);
        Crate previous = get(byBlock.get(p));
        if (previous != null) previous.locations().remove(p);
        crate.locations().add(p);
        byBlock.put(p, crate.id());
        save();
    }

    public boolean unbind(Block block) {
        BlockPos p = pos(block);
        Crate crate = get(byBlock.remove(p));
        if (crate == null) return false;
        crate.locations().remove(p);
        save();
        return true;
    }

    public void unbindAll(Crate crate) {
        for (BlockPos p : crate.locations()) byBlock.remove(p);
        crate.locations().clear();
        save();
    }

    // ---- Clés ----

    public static ItemStack defaultKey(String crateName) {
        ItemStack key = Items.icon(Material.TRIPWIRE_HOOK, "&eClé " + crateName,
                "&7Clic droit sur le coffre", "&7pour l'ouvrir.");
        ItemMeta meta = key.getItemMeta();
        meta.setEnchantmentGlintOverride(true);
        key.setItemMeta(meta);
        return key;
    }

    /** Clés authentifiées, prêtes à donner. */
    public ItemStack keys(Crate crate, int amount) {
        ItemStack key = crate.key();
        ItemMeta meta = key.getItemMeta();
        meta.getPersistentDataContainer().set(keyTag, PersistentDataType.STRING, crate.id());
        key.setItemMeta(meta);
        key.setAmount(Math.max(1, Math.min(amount, key.getMaxStackSize())));
        return key;
    }

    /** Identifiant du coffre que cet objet ouvre, ou null si ce n'est pas une clé. */
    public String keyOf(ItemStack item) {
        if (Items.isEmpty(item) || !item.hasItemMeta()) return null;
        return item.getItemMeta().getPersistentDataContainer().get(keyTag, PersistentDataType.STRING);
    }

    /** Retire le marqueur de clé (quand l'admin réutilise une clé existante comme modèle). */
    public ItemStack stripKeyTag(ItemStack item) {
        ItemStack copy = item.clone();
        if (!copy.hasItemMeta()) return copy;
        ItemMeta meta = copy.getItemMeta();
        meta.getPersistentDataContainer().remove(keyTag);
        copy.setItemMeta(meta);
        return copy;
    }

    // ---- Persistance ----

    public void load() {
        crates.clear();
        byBlock.clear();
        if (!file.exists()) return;
        YamlConfiguration yml = YamlConfiguration.loadConfiguration(file);
        ConfigurationSection root = yml.getConfigurationSection("crates");
        if (root == null) return;
        for (String id : root.getKeys(false)) {
            ConfigurationSection s = root.getConfigurationSection(id);
            try {
                String name = s.getString("name", id);
                String keyData = s.getString("key");
                Crate crate = new Crate(id, name, keyData == null ? defaultKey(name) : Items.decode(keyData));
                crate.animation(s.getBoolean("animation", true));
                ConfigurationSection rewards = s.getConfigurationSection("rewards");
                if (rewards != null) {
                    for (String i : rewards.getKeys(false)) {
                        ConfigurationSection r = rewards.getConfigurationSection(i);
                        try {
                            Reward reward = new Reward(Items.decode(r.getString("item")), r.getInt("weight", 10));
                            reward.giveItem(r.getBoolean("give-item", true));
                            reward.broadcast(r.getBoolean("broadcast", false));
                            reward.commands().addAll(r.getStringList("commands"));
                            crate.rewards().add(reward);
                        } catch (RuntimeException e) {
                            log.log(Level.WARNING, "Lot illisible ignoré : " + id + " #" + i, e);
                        }
                    }
                }
                for (String loc : s.getStringList("locations")) {
                    BlockPos p = BlockPos.parse(loc);
                    crate.locations().add(p);
                    byBlock.put(p, id);
                }
                crates.put(id, crate);
            } catch (RuntimeException e) {
                log.log(Level.SEVERE, "Coffre illisible ignoré : " + id, e);
            }
        }
        log.info(crates.size() + " coffre(s) chargé(s)");
    }

    public void save() {
        YamlConfiguration yml = new YamlConfiguration();
        yml.options().setHeader(List.of(
                "Coffres VaeloriaCrates — modifiés en jeu avec /crate admin.",
                "Les objets sont encodés (format Paper) : ne pas éditer « key » ni « item » à la main."));
        for (Crate c : crates.values()) {
            String base = "crates." + c.id() + ".";
            yml.set(base + "name", c.name());
            yml.set(base + "animation", c.animation());
            yml.set(base + "key", Items.encode(c.key()));
            yml.set(base + "locations", c.locations().stream().map(BlockPos::serialize).toList());
            int i = 0;
            for (Reward r : c.rewards()) {
                String rb = base + "rewards." + i++ + ".";
                yml.set(rb + "item", Items.encode(r.item()));
                yml.set(rb + "weight", r.weight());
                yml.set(rb + "give-item", r.giveItem());
                yml.set(rb + "broadcast", r.broadcast());
                yml.set(rb + "commands", new ArrayList<>(r.commands()));
            }
        }
        try {
            File tmp = new File(file.getParentFile(), file.getName() + ".tmp");
            yml.save(tmp);
            java.nio.file.Files.move(tmp.toPath(), file.toPath(),
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            log.log(Level.SEVERE, "Impossible d'enregistrer crates.yml", e);
        }
    }

    /** Nom affichable sans codes couleur (journaux, messages console). */
    public static String plainName(Crate crate) {
        return Text.plain(Text.of(crate.name()));
    }
}
