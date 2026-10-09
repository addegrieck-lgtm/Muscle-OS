package fr.vaeloria.staff.gui;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.broadcast.BroadcastType;
import fr.vaeloria.staff.broadcast.BroadcastsMenu;
import fr.vaeloria.staff.hologram.HologramsMenu;
import fr.vaeloria.staff.image.ImagesMenu;
import fr.vaeloria.staff.moderation.PlayersMenu;
import fr.vaeloria.staff.npc.NpcsMenu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.entity.Player;

/** /staff : accueil. Chaque bouton n'apparaît que si le joueur a la permission correspondante. */
public final class StaffHubMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;

    public StaffHubMenu(VaeloriaStaffPlugin plugin, Player viewer) {
        super(viewer, 5, "&8Staff VÆLORIA");
        this.plugin = plugin;
    }

    private boolean can(String perm) {
        return viewer.hasPermission(perm);
    }

    @Override
    protected void render() {
        long staffOnline = Bukkit.getOnlinePlayers().stream().filter(p -> p.hasPermission(Perm.USE)).count();
        set(4, Items.icon(Material.NETHER_STAR, "&6&lStaff VÆLORIA",
                "&7Joueurs connectés : &f" + Bukkit.getOnlinePlayers().size(),
                "&7Staff connecté : &f" + staffOnline));

        // Contenu du serveur
        if (can(Perm.BROADCAST)) set(10, Items.icon(Material.BELL, "&e&lAnnonces",
                "&7Chat, titre, barre d'action, barre de boss.",
                "&7Envoi immédiat ou rotation automatique.",
                "&8" + plugin.broadcasts().all().size() + " annonce(s)"), e -> new BroadcastsMenu(plugin, viewer).open());
        if (can(Perm.HOLOGRAM)) set(11, Items.icon(Material.OAK_HANGING_SIGN, "&e&lPancartes",
                "&7Textes flottants multilignes",
                "&7(règles, bienvenue, infos d'un jeu).",
                "&8" + plugin.holograms().all().size() + " pancarte(s)"), e -> new HologramsMenu(plugin, viewer).open());
        if (can(Perm.NPC)) set(12, Items.icon(Material.VILLAGER_SPAWN_EGG, "&e&lPNJ",
                "&7Personnages qui parlent et lancent",
                "&7des commandes au clic.",
                "&8" + plugin.npcs().all().size() + " PNJ"), e -> new NpcsMenu(plugin, viewer).open());
        if (can(Perm.IMAGE)) set(13, Items.icon(Material.FILLED_MAP, "&e&lImages HD",
                "&7Photos et explications des jeux",
                "&7sur un mur de cadres.",
                "&8" + plugin.images().all().size() + " image(s)"), e -> new ImagesMenu(plugin, viewer).open());
        if (can(Perm.BROADCAST)) set(14, Items.icon(Material.GOAT_HORN, "&e&lAnnonce rapide",
                "&7Envoie un message unique sans",
                "&7l'enregistrer (chat, titre…)."), e -> quickBroadcast());

        // Modération
        set(28, Items.icon(Material.PLAYER_HEAD, "&b&lJoueurs connectés", "&7Fiche, téléportation, sanctions."),
                e -> new PlayersMenu(plugin, viewer).open());
        if (can(Perm.MODE)) {
            boolean on = plugin.staffMode().is(viewer);
            set(29, Items.icon(on ? Material.LIME_CONCRETE : Material.ORANGE_CONCRETE, "&b&lMode staff : " + (on ? "&aactivé" : "&cdésactivé"),
                    "&7Outils de modération en main,", "&7vol, invulnérable, invisible.", "&7Ton inventaire est mis de côté."), e -> {
                plugin.staffMode().toggle(viewer);
                viewer.closeInventory();
            });
        }
        if (can(Perm.VANISH)) {
            boolean on = plugin.vanish().is(viewer);
            set(30, Items.icon(on ? Material.ENDER_EYE : Material.ENDER_PEARL, "&b&lInvisibilité : " + (on ? "&aactivée" : "&cdésactivée"),
                    "&eClic &7pour changer"), e -> {
                plugin.vanish().toggle(viewer);
                if (plugin.staffMode().is(viewer)) plugin.staffMode().giveTools(viewer);
                redraw();
            });
        }
        if (can(Perm.CHAT)) {
            boolean on = plugin.chat().inStaffChat(viewer);
            set(31, Items.icon(Material.PURPLE_DYE, "&d&lChat staff : " + (on ? "&aactivé" : "&cdésactivé"),
                    "&7Activé : tout ce que tu écris va au staff.", "&7Ou : &f/sc <message>"), e -> {
                plugin.chat().toggle(viewer);
                redraw();
            });
        }
        if (can(Perm.CHAT_MANAGE)) {
            boolean locked = plugin.chat().locked();
            set(32, Items.icon(locked ? Material.IRON_BARS : Material.OAK_FENCE_GATE, "&c&lChat public : " + (locked ? "&cverrouillé" : "&aouvert"),
                    "&eClic &7pour changer"), e -> {
                plugin.chat().lock(viewer, !locked);
                redraw();
            });
            set(33, Items.icon(Material.SPONGE, "&c&lNettoyer le chat", "&7Efface le chat de tous les joueurs."), e ->
                    new ConfirmMenu(viewer, "Nettoyer le chat ?", () -> {
                        plugin.chat().clear(viewer);
                        viewer.closeInventory();
                    }, this::open).open());
        }
        if (can(Perm.RELOAD)) set(44, Items.icon(Material.REPEATER, "&7Recharger", "&8config.yml et toutes les données"), e -> {
            plugin.reload();
            plugin.msg(viewer, "VaeloriaStaff rechargé.");
        });
        fillEmpty();
    }

    private void quickBroadcast() {
        plugin.prompts().ask(viewer, "Type et texte ? &8(&7chat&8, &7titre&8, &7action&8 ou &7boss&8, puis le texte ; "
                + "&7|&8 sépare les lignes. Ex. : &7titre &6Événement|&fDans 5 minutes&8)", input -> {
            String[] parts = input.trim().split("\\s+", 2);
            BroadcastType type = VaeloriaStaffPlugin.parseType(parts[0]);
            if (type == null || parts.length < 2) {
                plugin.msg(viewer, "&cCommence par chat, titre, action ou boss, puis le texte.");
                open();
                return;
            }
            plugin.quickBroadcast(type, parts[1]);
        }, this::open);
    }
}
