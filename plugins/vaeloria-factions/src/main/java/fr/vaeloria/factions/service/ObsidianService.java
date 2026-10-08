package fr.vaeloria.factions.service;

import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.format.TextDecoration;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.block.Block;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.RecipeChoice;
import org.bukkit.inventory.ShapelessRecipe;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.List;

/**
 * Obsidienne rare et indestructible.
 * <ul>
 *   <li>La génération eau + lave ne produit plus d'obsidienne (pierre à la place).</li>
 *   <li>L'obsidienne naturelle (portails en ruine, End, coffres, troc piglin) ne donne que des éclats.</li>
 *   <li>Il faut {@code per-obsidian} éclats pour recrafter un bloc.</li>
 *   <li>Durabilité réglable par matériau : 0 = indestructible par les explosions (défaut), N = N explosions.</li>
 * </ul>
 * Seul moyen de passer un mur d'obsidienne : surclaim le chunk, qui devient alors le vôtre.
 */
public final class ObsidianService {
    private final Settings settings;
    private final Store.State state;
    private final NamespacedKey shardKey;
    private final NamespacedKey recipeKey;
    private final JavaPlugin plugin;

    public ObsidianService(JavaPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
        this.shardKey = new NamespacedKey(plugin, "obsidian_shard");
        this.recipeKey = new NamespacedKey(plugin, "obsidian_from_shards");
    }

    public ItemStack shard(int amount) {
        ItemStack it = new ItemStack(settings.shardMaterial, Math.max(1, amount));
        ItemMeta meta = it.getItemMeta();
        meta.displayName(Msg.get("obsidian.shard-name").decoration(TextDecoration.ITALIC, false));
        meta.lore(List.of(
                Msg.get("obsidian.shard-lore-1", "n", settings.shardsPerObsidian).decoration(TextDecoration.ITALIC, false),
                Msg.get("obsidian.shard-lore-2").decoration(TextDecoration.ITALIC, false)));
        meta.setEnchantmentGlintOverride(true);
        meta.getPersistentDataContainer().set(shardKey, PersistentDataType.BYTE, (byte) 1);
        it.setItemMeta(meta);
        return it;
    }

    public boolean isShard(ItemStack it) {
        if (it == null || it.getType() != settings.shardMaterial || !it.hasItemMeta()) return false;
        return it.getItemMeta().getPersistentDataContainer().has(shardKey, PersistentDataType.BYTE);
    }

    public NamespacedKey recipeKey() { return recipeKey; }

    public void registerRecipe() {
        Bukkit.removeRecipe(recipeKey);
        ShapelessRecipe r = new ShapelessRecipe(recipeKey, new ItemStack(Material.OBSIDIAN));
        RecipeChoice.ExactChoice choice = new RecipeChoice.ExactChoice(shard(1));
        for (int i = 0; i < settings.shardsPerObsidian; i++) r.addIngredient(choice);
        Bukkit.addRecipe(r);
    }

    public void unregisterRecipe() {
        Bukkit.removeRecipe(recipeKey);
    }

    // ── Durabilité des blocs renforcés ──

    /** -1 : bloc ordinaire ; 0 : indestructible ; N : nombre d'explosions nécessaires. */
    public int durability(Material m) {
        Integer d = settings.reinforced.get(m);
        return d == null ? -1 : d;
    }

    public boolean indestructible(Material m) {
        return durability(m) == 0;
    }

    private static String key(Block b) {
        return b.getWorld().getName() + ";" + b.getX() + ";" + b.getY() + ";" + b.getZ();
    }

    /** Inflige une explosion au bloc ; vrai s'il cède. */
    public boolean damage(Block b) {
        int max = durability(b.getType());
        if (max <= 0) return false;
        String k = key(b);
        int hits = state.blockDamage.merge(k, 1, Integer::sum);
        if (hits >= max) {
            state.blockDamage.remove(k);
            b.setType(Material.AIR);
            return true;
        }
        return false;
    }

    public int hits(Block b) {
        return state.blockDamage.getOrDefault(key(b), 0);
    }

    public void forget(Block b) {
        if (!state.blockDamage.isEmpty()) state.blockDamage.remove(key(b));
    }

    public JavaPlugin plugin() { return plugin; }
}
