package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.CrateManager;
import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.util.Items;
import fr.vaeloria.crates.util.Text;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;

import java.util.ArrayList;
import java.util.List;

/** Clé personnalisée : n'importe quel objet, nom, description, brillance. */
public final class KeyEditMenu extends Menu {
    private final VaeloriaCratesPlugin plugin;
    private final Crate crate;

    public KeyEditMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate) {
        super(viewer, 3, "&8Clé : " + crate.id());
        this.plugin = plugin;
        this.crate = crate;
    }

    @Override
    protected void render() {
        set(4, Items.withLore(crate.key(), List.of("", "&8Aperçu de la clé",
                "&eDépose un objet ici &7(ou shift-clic", "&7dans ton inventaire) pour changer", "&7l'apparence de la clé.")),
                e -> useCursor());

        set(10, Items.icon(Material.NAME_TAG, "&fNom de la clé", "&7Couleurs avec &f&&7."), e -> rename());
        set(11, Items.icon(Material.WRITABLE_BOOK, "&fDescription", "&7Lignes séparées par &f|&7.",
                "&7Tape &fvide &7pour l'effacer."), e -> relore());
        ItemMeta keyMeta = crate.key().getItemMeta();
        boolean glint = keyMeta.hasEnchantmentGlintOverride() && keyMeta.getEnchantmentGlintOverride();
        set(12, Items.icon(glint ? Material.ENCHANTED_BOOK : Material.BOOK, "&fBrillance : " + (glint ? "&aoui" : "&cnon"),
                "&eClic &7pour changer"), e -> {
            ItemStack key = crate.key();
            ItemMeta meta = key.getItemMeta();
            meta.setEnchantmentGlintOverride(!glint);
            key.setItemMeta(meta);
            save(key);
        });
        set(13, Items.icon(Material.TRIPWIRE_HOOK, "&fRéinitialiser", "&7Revenir à la clé par défaut."),
                e -> save(CrateManager.defaultKey(crate.name())));

        set(15, Items.icon(Material.HOPPER, "&aMe donner 1 clé"), e -> give(1));
        set(16, Items.icon(Material.HOPPER, "&aMe donner 10 clés"), e -> give(10));
        set(18, Items.icon(Material.ARROW, "&fRetour"), e -> new CrateEditMenu(plugin, viewer, crate).open());
        set(22, Items.icon(Material.PAPER, "&7Les clés déjà distribuées",
                "&7restent valables si tu changes", "&7l'apparence : elles sont reconnues", "&7par un marqueur invisible."));
        fillEmpty();
    }

    private void useCursor() {
        ItemStack cursor = viewer.getItemOnCursor();
        if (Items.isEmpty(cursor)) {
            plugin.msg(viewer, "Prends un objet au curseur et dépose-le sur l'aperçu.");
            return;
        }
        onShiftFromInventory(cursor.clone());
    }

    @Override
    public void onShiftFromInventory(ItemStack item) {
        ItemStack key = plugin.crates().stripKeyTag(item);
        key.setAmount(1);
        save(key);
        plugin.msg(viewer, "Nouvelle apparence de clé enregistrée.");
    }

    private void rename() {
        plugin.prompts().ask(viewer, "Nom de la clé ? &8(ex. &7&e&lClé Légendaire&8)", name -> {
            ItemStack key = crate.key();
            ItemMeta meta = key.getItemMeta();
            meta.displayName(Text.of(name));
            key.setItemMeta(meta);
            save(key);
            open();
        }, this::open);
    }

    private void relore() {
        plugin.prompts().ask(viewer, "Description de la clé ? &8(ex. &7&7Ouvre le coffre|&7au spawn&8)", input -> {
            ItemStack key = crate.key();
            ItemMeta meta = key.getItemMeta();
            List<Component> lore = new ArrayList<>();
            if (!input.equalsIgnoreCase("vide")) for (String line : input.split("\\|")) lore.add(Text.of(line));
            meta.lore(lore);
            key.setItemMeta(meta);
            save(key);
            open();
        }, this::open);
    }

    private void give(int amount) {
        plugin.giveKeys(viewer, crate, amount);
    }

    private void save(ItemStack key) {
        crate.key(key);
        plugin.crates().save();
        redraw();
    }
}
