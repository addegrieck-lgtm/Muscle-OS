package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.BlockPos;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Material;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

/** Fiche d'un coffre : accès aux lots, à la clé, au placement et aux réglages. */
public final class CrateEditMenu extends Menu {
    private final VaeloriaCratesPlugin plugin;
    private final Crate crate;

    public CrateEditMenu(VaeloriaCratesPlugin plugin, Player viewer, Crate crate) {
        super(viewer, 4, "&8Coffre : " + crate.id());
        this.plugin = plugin;
        this.crate = crate;
    }

    @Override
    protected void render() {
        set(4, Items.icon(Material.CHEST, crate.name(),
                "&7Identifiant : &f" + crate.id(),
                "&7Lots : &f" + crate.rewards().size(),
                "&7Emplacements : &f" + crate.locations().size(),
                "",
                "&7Donner des clés :",
                "&f/crate give <joueur> " + crate.id() + " [n]"));

        set(10, Items.icon(Material.CHEST_MINECART, "&6Lots",
                "&7Dépose tes propres objets", "&7et règle leurs chances.", "", "&eClic &7pour ouvrir"),
                e -> new LootEditMenu(plugin, viewer, crate).open());
        set(11, Items.withLore(crate.key(), List.of("", "&6Clé personnalisée",
                "&7Objet, nom, description, brillance,", "&7et clés à te donner.", "", "&eClic &7pour ouvrir")),
                e -> new KeyEditMenu(plugin, viewer, crate).open());
        set(12, Items.icon(Material.NAME_TAG, "&fRenommer", "&7Actuel : " + crate.name()), e -> rename());
        set(13, Items.icon(Material.SPYGLASS, "&fAperçu joueur", "&7Ce que voient les joueurs", "&7au clic gauche sur le coffre."),
                e -> new PreviewMenu(plugin, viewer, crate, () -> new CrateEditMenu(plugin, viewer, crate).open()).open());
        set(14, Items.icon(crate.animation() ? Material.CLOCK : Material.GUNPOWDER,
                "&fAnimation : " + (crate.animation() ? "&aroulette" : "&eouverture instantanée"), "&eClic &7pour changer"),
                e -> { crate.animation(!crate.animation()); plugin.crates().save(); redraw(); });

        List<String> locLore = new ArrayList<>(List.of("&7Clic, puis clic droit sur un bloc", "&7du monde (coffre, ender chest…).", ""));
        int shown = 0;
        for (BlockPos p : crate.locations()) {
            if (shown++ == 5) { locLore.add("&8…"); break; }
            locLore.add("&8• &7" + p);
        }
        set(15, Items.icon(Material.ENDER_CHEST, "&bPlacer le coffre", locLore.toArray(String[]::new)), e -> startBinding());
        set(16, Items.icon(Material.BARRIER, "&cRetirer tous les emplacements",
                "&7Les blocs redeviennent normaux.", "&8(ou accroupi + casser le bloc)"),
                e -> new ConfirmMenu(viewer, "Retirer les " + crate.locations().size() + " emplacements ?", () -> {
                    plugin.crates().unbindAll(crate);
                    plugin.msg(viewer, "Emplacements retirés.");
                    open();
                }, this::open).open());

        set(27, Items.icon(Material.ARROW, "&fRetour"), e -> new CratesMenu(plugin, viewer).open());
        set(35, Items.icon(Material.LAVA_BUCKET, "&4Supprimer le coffre", "&7Les clés déjà données", "&7ne fonctionneront plus."),
                e -> new ConfirmMenu(viewer, "Supprimer " + crate.id() + " ?", () -> {
                    plugin.crates().delete(crate);
                    plugin.msg(viewer, "Coffre supprimé.");
                    new CratesMenu(plugin, viewer).open();
                }, this::open).open());
        fillEmpty();
    }

    private void rename() {
        plugin.prompts().ask(viewer, "Nouveau nom affiché de " + crate.name() + " &7?", name -> {
            crate.name(name);
            plugin.crates().save();
            plugin.msg(viewer, "Renommé en " + name + "&7. &8(l'identifiant reste " + crate.id() + ")");
            open();
        }, this::open);
    }

    private void startBinding() {
        plugin.prompts().ask(viewer, "Fais un &fclic droit sur le bloc &7qui deviendra " + crate.name() + "&7.", input -> {
            plugin.binding().remove(viewer.getUniqueId());
            open();
        }, () -> {
            plugin.binding().remove(viewer.getUniqueId());
            open();
        });
        plugin.binding().put(viewer.getUniqueId(), crate.id());
    }
}
