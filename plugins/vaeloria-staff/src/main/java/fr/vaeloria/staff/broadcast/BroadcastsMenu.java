package fr.vaeloria.staff.broadcast;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.gui.StaffHubMenu;
import fr.vaeloria.staff.util.Ids;
import fr.vaeloria.staff.util.Items;
import fr.vaeloria.staff.util.Text;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.ArrayList;
import java.util.List;

/** Liste des annonces, création, réglages de la rotation automatique. */
public final class BroadcastsMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private int page;

    public BroadcastsMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 6, "&8Annonces");
        this.plugin = plugin;
    }

    @Override
    protected void render() {
        BroadcastManager bm = plugin.broadcasts();
        List<Broadcast> all = new ArrayList<>(bm.all());
        int pages = Math.max(1, (all.size() + 44) / 45);
        page = Math.min(page, pages - 1);
        for (int i = 0; i < 45 && page * 45 + i < all.size(); i++) {
            Broadcast b = all.get(page * 45 + i);
            List<String> lore = new ArrayList<>();
            lore.add("&7Type : &f" + b.type().label + (b.auto() ? " &8· &aautomatique" : ""));
            lore.add("&7Id : &f" + b.id());
            lore.add("");
            b.lines().stream().limit(5).forEach(l -> lore.add("&8│ &r" + l));
            if (b.lines().size() > 5) lore.add("&8│ …");
            lore.add("");
            lore.add("&eClic gauche &7: modifier");
            lore.add("&eClic droit &7: envoyer maintenant");
            set(i, Items.icon(b.type().icon, "&f" + b.name(), lore.toArray(String[]::new)), e -> {
                if (e.getClick() == ClickType.RIGHT) {
                    bm.send(b);
                    plugin.msg(viewer, "Annonce &f" + b.id() + " &7envoyée.");
                } else {
                    new BroadcastEditMenu(plugin, viewer, b).open();
                }
            });
        }
        for (int i = 45; i < 54; i++) set(i, Items.filler());
        set(45, Items.icon(Material.ARROW, "&fRetour"), e -> new StaffHubMenu(plugin, viewer).open());
        if (page > 0) set(46, Items.icon(Material.ARROW, "&fPage précédente"), e -> { page--; redraw(); });
        if (page < pages - 1) set(53, Items.icon(Material.ARROW, "&fPage suivante"), e -> { page++; redraw(); });
        set(49, Items.icon(Material.EMERALD, "&aNouvelle annonce",
                "&7Chat, titre, barre d'action, barre de boss,", "&7avec son, durée et public au choix."), e -> create());
        long autos = all.stream().filter(Broadcast::auto).count();
        set(50, Items.icon(Material.CLOCK, "&eRotation automatique",
                "&7Une annonce &aautomatique &7toutes les &f" + bm.interval() + " s",
                "&7Annonces dans la rotation : &f" + autos,
                "&7Prochaine dans : &f" + bm.secondsLeft() + " s",
                "",
                "&eClic gauche/droit &7: ±30 s",
                "&eShift-clic &7: saisir en secondes"), e -> {
            if (e.isShiftClick()) {
                plugin.prompts().ask(viewer, "Intervalle en secondes ? &8(minimum 10)", s -> {
                    try { bm.interval(Integer.parseInt(s.trim())); } catch (NumberFormatException ex) { plugin.msg(viewer, "&cNombre invalide."); }
                    open();
                }, this::open);
                return;
            }
            bm.interval(bm.interval() + (e.isRightClick() ? -30 : 30));
            redraw();
        });
        set(51, Items.icon(bm.random() ? Material.ENDER_EYE : Material.ENDER_PEARL,
                "&eOrdre : &f" + (bm.random() ? "aléatoire" : "à la suite"), "&eClic &7pour changer"), e -> {
            bm.random(!bm.random());
            redraw();
        });
        set(52, Items.icon(Material.PLAYER_HEAD, "&eJoueurs minimum : &f" + bm.minPlayers(),
                "&7Pas d'annonce automatique s'il y a", "&7moins de joueurs connectés.", "", "&eClic gauche/droit &7: ±1"), e -> {
            bm.minPlayers(bm.minPlayers() + (e.isRightClick() ? -1 : 1));
            redraw();
        });
    }

    private void create() {
        plugin.prompts().ask(viewer, "Nom de l'annonce ? &8(pour la retrouver, ex. &7Discord&8)", name -> {
            String id = Ids.unique(name, "annonce", plugin.broadcasts()::exists);
            Broadcast b = plugin.broadcasts().create(id, name);
            plugin.msg(viewer, "Annonce créée : &f" + Text.strip(name) + " &7(id &f" + id + "&7).");
            new BroadcastEditMenu(plugin, viewer, b).open();
        }, this::open);
    }
}
