package fr.vaeloria.mines.gui;

import fr.vaeloria.mines.MineCommand;
import fr.vaeloria.mines.MineManager;
import fr.vaeloria.mines.VaeloriaMinesPlugin;
import fr.vaeloria.mines.model.Durations;
import fr.vaeloria.mines.model.Mine;
import fr.vaeloria.mines.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Réglages d'une mine : zone, blocs, délai, point d'arrivée, hologramme, annonces, réinitialisation. */
public final class MineEditMenu extends Menu {
    private static final int[] PERCENTS = {0, 25, 50, 75, 90};

    private final VaeloriaMinesPlugin plugin;
    private final Mine mine;

    public MineEditMenu(VaeloriaMinesPlugin plugin, Player viewer, Mine mine) {
        super(viewer, 5, "&8Mine — " + mine.id());
        this.plugin = plugin;
        this.mine = mine;
    }

    /** Icône d'une mine : son bloc principal (s'il existe en objet). */
    public static Material icon(Mine mine) {
        String main = mine.composition().main();
        Material m = main == null ? null : MineManager.block(main);
        return m != null && m.isItem() ? m : Material.STONE;
    }

    @Override
    public boolean live() {
        return true;
    }

    @Override
    protected void render() {
        if (plugin.mines().get(mine.id()) != mine) { // supprimée ou rechargée entre-temps
            viewer.closeInventory();
            return;
        }
        long now = System.currentTimeMillis();
        set(4, Items.icon(icon(mine), mine.name(),
                "&8" + mine.id(),
                "",
                plugin.state(mine, now, false),
                "&7Minée à &f" + Math.round(mine.minedPercent()) + "%",
                "",
                "&eClic &7pour renommer"), e -> rename());

        set(10, Items.icon(Material.BLAZE_ROD, "&6Zone",
                mine.region() == null ? "&cNon définie" : "&f" + mine.region(),
                mine.region() == null ? "" : "&7" + mine.region().sizeX() + "×" + mine.region().sizeY() + "×" + mine.region().sizeZ()
                        + " = &f" + mine.region().volume() + " &7blocs",
                "",
                "&eClic gauche &7: utiliser ma sélection",
                "&eClic droit &7: recevoir la baguette"), e -> {
            if (e.isRightClick()) {
                viewer.closeInventory();
                plugin.giveWand(viewer);
            } else {
                MineCommand.applySelection(plugin, viewer, mine);
                redraw();
            }
        });

        set(12, Items.icon(icon(mine), "&bBlocs régénérés", blocksLore()), e -> new CompositionMenu(plugin, viewer, mine).open());

        set(14, Items.icon(Material.CLOCK, "&eDélai : &f" + Durations.format(mine.intervalSeconds()),
                "&7La mine est réinitialisée toutes les",
                "&f" + Durations.format(mine.intervalSeconds()) + "&7.",
                "",
                "&eClic gauche / droit &7: +1 / -1 min",
                "&eShift + clic &7: +10 / -10 min",
                "&eQ &7(jeter) : saisir un délai"), e -> {
            long step = e.isShiftClick() ? 600 : 60;
            if (e.getClick() == ClickType.DROP || e.getClick() == ClickType.CONTROL_DROP) {
                askInterval();
                return;
            }
            long next = mine.intervalSeconds() + (e.isRightClick() ? -step : step);
            // Sous la minute, -1 min ramène au minimum (10 s) plutôt que de rester bloqué.
            mine.intervalSeconds(Math.max(Durations.MIN_SECONDS, next), System.currentTimeMillis());
            plugin.mines().save();
            redraw();
        });
        set(16, Items.icon(Material.NAME_TAG, "&eSaisir un délai", "&7Ex. &f15m&7, &f1h30&7, &f90s&7, &f2h"), e -> askInterval());

        set(19, Items.icon(Material.ENDER_PEARL, "&dPoint d'arrivée",
                mine.spawn() == null ? "&7Non défini : dessus de la zone" : "&f" + Math.round(mine.spawn().x()) + " "
                        + Math.round(mine.spawn().y()) + " " + Math.round(mine.spawn().z()),
                "&7Les joueurs dans la mine y sont mis",
                "&7à l'abri à chaque réinitialisation.",
                "",
                "&eClic gauche &7: ma position",
                "&eClic droit &7: m'y téléporter",
                "&eQ &7: retirer"), e -> {
            if (e.getClick() == ClickType.DROP || e.getClick() == ClickType.CONTROL_DROP) mine.spawn(null);
            else if (e.isRightClick()) {
                Location to = plugin.arrival(mine);
                if (to != null) {
                    viewer.closeInventory();
                    viewer.teleport(to);
                }
                return;
            } else mine.spawn(VaeloriaMinesPlugin.spot(viewer.getLocation()));
            plugin.mines().save();
            redraw();
        });

        set(21, Items.icon(Material.OAK_SIGN, "&dHologramme",
                mine.hologram() == null ? "&7Aucun" : "&f" + Math.round(mine.hologram().x()) + " "
                        + Math.round(mine.hologram().y()) + " " + Math.round(mine.hologram().z()),
                "&7Texte flottant : nom de la mine",
                "&7et temps avant réinitialisation.",
                "",
                "&eClic gauche &7: le placer ici",
                "&eClic droit &7: le retirer"), e -> {
            if (e.isRightClick()) mine.hologram(null);
            else {
                Location l = viewer.getEyeLocation();
                mine.hologram(VaeloriaMinesPlugin.spot(l));
            }
            plugin.mines().save();
            redraw();
        });

        set(23, Items.icon(mine.announce() ? Material.BELL : Material.GRAY_DYE,
                "&6Annonces : " + (mine.announce() ? "&aactivées" : "&cdésactivées"),
                "&7« " + plugin.fill(plugin.getConfig().getString("messages.warning", ""), mine, 900) + " &7»",
                "&7« " + plugin.fill(plugin.getConfig().getString("messages.reset", ""), mine, mine.intervalSeconds()) + " &7»",
                "",
                "&eClic &7pour basculer"), e -> {
            mine.announce(!mine.announce());
            plugin.mines().save();
            redraw();
        });

        set(25, Items.icon(Material.IRON_PICKAXE, "&6Réinitialisation anticipée : "
                        + (mine.resetPercent() == 0 ? "&cnon" : "&f" + mine.resetPercent() + "% miné"),
                "&7Réinitialise aussi la mine dès que",
                "&7ce pourcentage de la zone a été miné.",
                "",
                "&eClic gauche / droit &7: changer"), e -> {
            int i = 0;
            while (i < PERCENTS.length && PERCENTS[i] != mine.resetPercent()) i++;
            i = i == PERCENTS.length ? 0 : Math.floorMod(i + (e.isRightClick() ? -1 : 1), PERCENTS.length);
            mine.resetPercent(PERCENTS[i]);
            plugin.mines().save();
            redraw();
        });

        set(30, Items.icon(Material.TNT, "&cRéinitialiser maintenant",
                "&7Régénère la zone tout de suite", "&7et relance le compte à rebours."), e -> {
            MineCommand.resetNow(plugin, viewer, mine);
            redraw();
        });
        set(32, Items.icon(mine.paused() ? Material.LIME_DYE : Material.ORANGE_DYE,
                mine.paused() ? "&aReprendre" : "&6Mettre en pause",
                mine.paused() ? "&7Le compte à rebours repart." : "&7Le compte à rebours est figé."), e -> {
            long t = System.currentTimeMillis();
            if (mine.paused()) mine.resume(t);
            else mine.pause(t);
            plugin.mines().save();
            redraw();
        });

        set(36, Items.icon(Material.ARROW, "&fRetour"), e -> new MinesMenu(plugin, viewer).open());
        set(44, Items.icon(Material.BARRIER, "&cSupprimer la mine", "&7Les blocs du monde ne sont pas modifiés."),
                e -> new ConfirmMenu(viewer, "Supprimer " + mine.name() + " &f?", () -> {
                    plugin.mines().delete(mine);
                    plugin.msg(viewer, "Mine " + mine.name() + " &7supprimée.");
                    new MinesMenu(plugin, viewer).open();
                }, this::open).open());
        fillEmpty();
    }

    private String[] blocksLore() {
        List<String> lines = new ArrayList<>();
        if (mine.composition().isEmpty()) lines.add("&cAucun bloc");
        mine.composition().weights().keySet().forEach(b -> lines.add("&f" + b.toLowerCase(Locale.ROOT).replace('_', ' ')
                + " &7" + Math.round(mine.composition().percent(b)) + "%"));
        lines.add("");
        lines.add("&eClic &7pour modifier");
        return lines.toArray(String[]::new);
    }

    private void rename() {
        plugin.prompts().ask(viewer, "Nouveau nom de la mine ? &8(couleurs avec &7&&8 ; l'identifiant &7" + mine.id() + " &8ne change pas)",
                name -> {
                    mine.name(name);
                    plugin.mines().save();
                    open();
                }, this::open);
    }

    private void askInterval() {
        plugin.prompts().ask(viewer, "Délai entre deux réinitialisations ? &8(ex. &715m&8, &71h30&8, &790s&8)", input -> {
            long seconds = Durations.parse(input);
            if (seconds < 0) plugin.msg(viewer, "&cDélai invalide (10 s à 7 j).");
            else {
                mine.intervalSeconds(seconds, System.currentTimeMillis());
                plugin.mines().save();
                plugin.msg(viewer, mine.name() + " &7: toutes les &f" + Durations.format(seconds) + "&7.");
            }
            open();
        }, this::open);
    }
}
