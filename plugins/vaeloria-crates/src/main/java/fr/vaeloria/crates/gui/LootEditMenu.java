package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.model.Weighted;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.ItemStack;

import java.util.List;

/**
 * Éditeur de lots : l'admin dépose ses objets (copiés, il les garde) ; clic sur un lot pour régler
 * sa chance, ses commandes et son annonce.
 */
public final class LootEditMenu extends Menu {
    public static final int DEFAULT_WEIGHT = 10;

    private final VaeloriaCratesPlugin plugin;
    private final Crate crate;
    private int page;

    public LootEditMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate) {
        this(plugin, viewer, crate, 0);
    }

    public LootEditMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate, int page) {
        super(viewer, 6, "&8Lots : " + crate.id());
        this.plugin = plugin;
        this.crate = crate;
        this.page = page;
    }

    @Override
    protected void render() {
        List<Reward> rewards = crate.rewards();
        int pages = Math.max(1, rewards.size() / 45 + 1); // toujours une case libre pour ajouter
        page = Math.min(page, pages - 1);
        long total = crate.totalWeight();
        for (int i = 0; i < 45; i++) {
            int index = page * 45 + i;
            if (index < rewards.size()) {
                Reward r = rewards.get(index);
                set(i, Items.withLore(r.item(), describe(r, total)), e -> {
                    if (!Items.isEmpty(viewer.getItemOnCursor())) {
                        add(viewer.getItemOnCursor().clone());
                        return;
                    }
                    new RewardEditMenu(plugin, viewer, crate, r, page).open();
                });
            } else {
                set(i, null, this::dropOnEmpty);
            }
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new CrateEditMenu(plugin, viewer, crate).open());
        if (page > 0) set(48, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(50, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.BOOK, "&eAjouter des lots",
                "&7• Dépose un objet sur une case vide",
                "&7• ou shift-clic dans ton inventaire",
                "&7L'objet est copié tel quel (enchantements,",
                "&7nom, quantité) : tu gardes l'original.",
                "",
                "&7Clic sur un lot : chance, commandes,",
                "&7annonce, suppression.",
                "",
                "&7Lots : &f" + rewards.size() + " &8· &7Poids total : &f" + total));
    }

    static List<String> describe(Reward r, long total) {
        return List.of(
                "",
                "&8―――――――――――――",
                "&7Chance : &a" + Weighted.percent(r.weight(), total) + " &8(poids " + r.weight() + ")",
                "&7Objet donné : " + (r.giveItem() ? "&aoui" : "&cnon (icône seule)"),
                "&7Commandes : &f" + r.commands().size(),
                "&7Annonce : " + (r.broadcast() ? "&aoui" : "&cnon"),
                "&eClic &7pour modifier");
    }

    private void dropOnEmpty(InventoryClickEvent e) {
        ItemStack cursor = viewer.getItemOnCursor();
        if (!Items.isEmpty(cursor)) add(cursor.clone());
    }

    @Override
    public void onShiftFromInventory(ItemStack item) {
        add(item);
    }

    /** Une clé déposée garde son marqueur : on peut mettre la clé d'un autre coffre en lot. */
    private void add(ItemStack item) {
        crate.rewards().add(new Reward(item, DEFAULT_WEIGHT));
        plugin.crates().save();
        page = (crate.rewards().size() - 1) / 45;
        redraw();
    }
}
