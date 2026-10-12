package fr.vaeloria.staff.opening;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.ConfirmMenu;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Durations;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

/** /staff → Ouverture : whitelist, ouverture programmée, liste d'attente. */
public final class OpeningMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;

    public OpeningMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 5, "&8Ouverture du serveur");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        OpeningManager o = plugin.opening();
        boolean closed = o.closed();
        ZonedDateTime at = o.scheduled();

        set(4, Items.icon(closed ? Material.RED_CONCRETE : Material.LIME_CONCRETE,
                closed ? "&c&lServeur fermé &7(whitelist)" : "&a&lServeur ouvert",
                at == null ? "&7Aucune ouverture programmée" : "&7Ouverture : &e" + OpeningTimes.display(at),
                at == null ? "" : "&7Dans : &f" + Durations.format(o.remaining()),
                "&7Joueurs qui attendent : &f" + o.waiting().size(),
                "&7Sur la whitelist : &f" + Bukkit.getWhitelistedPlayers().size()));

        if (closed) {
            set(10, Items.icon(Material.FIREWORK_ROCKET, "&a&lOuvrir avec compte à rebours",
                    "&710 secondes de compte à rebours,", "&7puis titre, sons et feux d'artifice.", "",
                    "&eClic gauche &7: 10 s", "&eClic droit &7: 1 min"), e -> {
                int seconds = e.isRightClick() ? 60 : 10;
                o.schedule(viewer, ZonedDateTime.now().plusSeconds(seconds + 1));
                viewer.closeInventory();
            });
            set(11, Items.icon(Material.OAK_DOOR, "&aOuvrir tout de suite", "&7Sans spectacle."), e ->
                    new ConfirmMenu(viewer, "Ouvrir le serveur maintenant ?", () -> {
                        o.open(viewer, false);
                        open();
                    }, this::open).open());
        } else {
            set(10, Items.icon(Material.IRON_DOOR, "&c&lFermer le serveur",
                    "&7Active la whitelist et expulse les", "&7joueurs qui ne sont pas autorisés."), e ->
                    new ConfirmMenu(viewer, "Fermer le serveur (whitelist) ?", () -> {
                        o.close(viewer);
                        open();
                    }, this::open).open());
        }
        set(13, Items.icon(Material.CLOCK, at == null ? "&eProgrammer l'ouverture" : "&eChanger la date d'ouverture",
                "&7Ex. : &f20/10 18h&7, &f2026-10-20 18:00&7, &f18h30&7, &f+2h",
                "&7Le serveur s'ouvre tout seul à l'heure,",
                "&7avec annonces, barre de boss et spectacle.",
                "",
                at == null ? "&eClic &7pour saisir" : "&eClic &7: changer · &eShift-clic droit &7: annuler"), e -> {
            if (at != null && e.getClick() == ClickType.SHIFT_RIGHT) {
                o.cancelSchedule(viewer);
                redraw();
                return;
            }
            plugin.prompts().ask(viewer, "Date d'ouverture ? &8(ex. &720/10 18h&8, &718h30&8, &7+2h&8)", s -> {
                try {
                    ZonedDateTime when = OpeningTimes.parse(s, ZonedDateTime.now());
                    o.schedule(viewer, when);
                    plugin.msg(viewer, "Ouverture programmée : &e" + OpeningTimes.display(when));
                } catch (IllegalArgumentException ex) {
                    plugin.msg(viewer, "&cDate illisible ou passée : &f" + s);
                }
                open();
            }, this::open);
        });
        set(14, Items.icon(Material.PAPER, "&eWhitelist &7(" + Bukkit.getWhitelistedPlayers().size() + ")",
                "&7Staff, testeurs, créateurs de contenu…", "&eClic &7pour gérer"), e -> new WhitelistMenu(plugin, viewer).open());

        List<String> names = new ArrayList<>(o.waiting().values());
        List<String> lore = new ArrayList<>();
        lore.add("&7Joueurs refusés pendant la fermeture : &f" + names.size());
        lore.add("&7Affiché dans le MOTD et le message d'attente,");
        lore.add("&7ils reçoivent un bonus à l'ouverture.");
        lore.add("");
        names.stream().limit(12).forEach(n -> lore.add("&8• &f" + n));
        if (names.size() > 12) lore.add("&8… et " + (names.size() - 12) + " autre(s)");
        lore.add("");
        lore.add("&eShift-clic droit &7: remettre à zéro");
        set(15, Items.icon(Material.PLAYER_HEAD, "&eJoueurs qui attendent", lore.toArray(String[]::new)), e -> {
            if (e.getClick() == ClickType.SHIFT_RIGHT) {
                new ConfirmMenu(viewer, "Vider la liste d'attente et les récompenses ?", () -> {
                    o.resetWaiting();
                    open();
                }, this::open).open();
            }
        });
        set(16, Items.icon(Material.SPYGLASS, "&bAperçu", "&7Te montre le MOTD et le message", "&7affiché aux joueurs refusés."), e -> {
            viewer.closeInventory();
            plugin.msg(viewer, "&7Message d'attente :");
            viewer.sendMessage(o.kickMessage());
            var motd = o.motd();
            plugin.msg(viewer, "&7MOTD :" + (motd == null ? " &8(celui du serveur, serveur ouvert)" : ""));
            if (motd != null) viewer.sendMessage(motd);
        });

        set(36, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        set(44, Items.icon(Material.CLOCK, "&fActualiser"), e -> redraw());
        fillEmpty();
    }
}
