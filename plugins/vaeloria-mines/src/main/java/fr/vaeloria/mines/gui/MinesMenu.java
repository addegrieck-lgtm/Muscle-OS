package fr.vaeloria.mines.gui;

import fr.vaeloria.mines.MineCommand;
import fr.vaeloria.mines.VaeloriaMinesPlugin;
import fr.vaeloria.mines.model.Durations;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.model.MineIds;
import fr.vaeloria.mines.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** Accueil admin : liste des mines (avec compte à rebours en direct) + création. */
public final class MinesMenu extends Menu {
    private final VaeloriaMinesPlugin plugin;
    private int page;

    public MinesMenu(VaeloriaMinesPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Mines — administration");
        this.plugin = plugin;
    }

    @Override
    public boolean live() {
        return true;
    }

    @Override
    protected void render() {
        long now = System.currentTimeMillis();
        List<Mine> all = new ArrayList<>(plugin.mines().all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Mine mine = all.get(page * 45 + i);
            set(i, Items.icon(MineEditMenu.icon(mine), mine.name(),
                    "&8" + mine.id(),
                    "",
                    plugin.state(mine, now, false),
                    "&7Toutes les &f" + Durations.format(mine.intervalSeconds()),
                    "&7Zone : &f" + (mine.region() == null ? "&cnon définie" : mine.region().volume() + " blocs"),
                    "&7Blocs : &f" + (mine.composition().isEmpty() ? "&caucun" : mine.composition().weights().size() + " type(s)"),
                    "",
                    "&eClic &7pour modifier",
                    "&eClic droit &7pour réinitialiser maintenant"), e -> {
                if (e.isRightClick()) MineCommand.resetNow(plugin, viewer, mine);
                else new MineEditMenu(plugin, viewer, mine).open();
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        if (page > 0) set(45, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(48, Items.icon(Material.BOOK, "&eAide",
                "&71. &fBaguette &7: clic gauche = coin 1,",
                "&7   clic droit = coin 2 de la zone",
                "&72. &fCréer une mine &7(la sélection",
                "&7   devient sa zone)",
                "&73. &fBlocs &7: dépose ex. de l'obsidienne",
                "&74. &fDélai &7: ex. 15m → réinitialisée",
                "&7   toutes les 15 minutes, avec annonces"));
        set(49, Items.icon(Material.EMERALD, "&aCréer une mine",
                "&7Ta sélection actuelle (baguette)", "&7devient sa zone."), e -> askName());
        set(50, Items.icon(Material.BLAZE_ROD, "&6Recevoir la baguette",
                "&7Clic gauche sur un bloc : coin 1", "&7Clic droit sur un bloc : coin 2"), e -> {
            viewer.closeInventory();
            plugin.giveWand(viewer);
        });
    }

    private void askName() {
        plugin.prompts().ask(viewer, "Nom de la nouvelle mine ? &8(couleurs avec &7&&8, ex. &7&5Mine d'obsidienne&8)",
                name -> {
                    String id = MineIds.slug(name);
                    if (id.isEmpty()) {
                        plugin.msg(viewer, "&cNom invalide : utilise au moins une lettre ou un chiffre.");
                        open();
                        return;
                    }
                    if (plugin.mines().get(id) != null) {
                        plugin.msg(viewer, "&cLa mine « " + id + " » existe déjà.");
                        open();
                        return;
                    }
                    Mine mine = plugin.mines().create(id, name);
                    plugin.msg(viewer, "Mine créée : " + mine.name() + " &7(id &f" + id + "&7).");
                    if (plugin.selection(viewer) != null) MineCommand.applySelection(plugin, viewer, mine);
                    new MineEditMenu(plugin, viewer, mine).open();
                }, this::open);
    }
}
