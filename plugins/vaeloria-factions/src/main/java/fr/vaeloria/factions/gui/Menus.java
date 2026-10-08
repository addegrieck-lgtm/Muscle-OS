package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Role;
import fr.vaeloria.factions.rules.ShieldWindow;
import fr.vaeloria.factions.service.FactionManager;
import fr.vaeloria.factions.util.Msg;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.OfflinePlayer;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.SkullMeta;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Menus graphiques : accueil de faction, membres, permissions. */
public final class Menus {
    private final VaeloriaFactionsPlugin plugin;

    public Menus(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private FactionManager m() { return plugin.manager(); }

    private static Component t(String mini, Object... kv) { return Msg.parse(mini, kv); }

    private static void run(Player p, String cmd) {
        p.closeInventory();
        p.performCommand(cmd);
    }

    public void openMain(Player p) {
        Faction f = m().factionOf(p);
        if (f == null) {
            openNoFaction(p);
            return;
        }
        FPlayer fp = m().fplayer(p);
        Menu menu = new Menu(5, Msg.get("menu.title", "faction", f.name));
        String state = f.inRaid() ? "<red>⚠ Pillage en cours" : plugin.raid().shielded(f) ? "<aqua>⛨ Bouclier actif"
                : m().isVulnerable(f) ? "<gold>⚠ Surclaimable !" : "<green>Territoire tenu";
        menu.set(4, Menu.item(Material.WHITE_BANNER, t("<gold><b><n>", "n", f.name), List.of(
                t("<gray><d>", "d", f.description.isEmpty() ? "Aucune description" : f.description),
                Component.empty(),
                t("<gray>Power : <white><v1></white>/<white><v2>", "v1", Msg.fmt(m().power(f)), "v2", Msg.fmt(m().maxPower(f))),
                t("<gray>Claims : <white><v1></white>/<white><v2>", "v1", f.claims.size(), "v2", m().landLimit(f)),
                t("<gray>Membres : <white><v1></white> (<green><v2></green> en ligne)", "v1", f.members.size(), "v2", m().online(f).size()),
                t(state),
                Component.empty(),
                t("<yellow>Clic : fiche complète"))), (pl, c) -> run(pl, "f info"));

        menu.set(19, Menu.item(Material.PLAYER_HEAD, t("<green><b>Membres"), List.of(t("<gray>Gérer les rangs"), t("<yellow>Clic : ouvrir"))),
                (pl, c) -> openMembers(pl));
        menu.set(20, Menu.item(Material.FILLED_MAP, t("<aqua><b>Carte"), List.of(t("<gray>La /f map des anciens"), t("<yellow>Clic : afficher"))),
                (pl, c) -> run(pl, "f carte"));
        menu.set(21, Menu.item(Material.RED_BED, t("<light_purple><b>Home"), List.of(
                t(f.home == null ? "<red>Aucun home" : "<gray>Se téléporter au home"), t("<yellow>Clic : y aller"))), (pl, c) -> run(pl, "f home"));
        menu.set(22, Menu.item(Material.ENDER_CHEST, t("<gold><b>Coffre de faction"), List.of(t("<gray>Partagé entre les membres"), t("<yellow>Clic : ouvrir"))),
                (pl, c) -> run(pl, "f coffre"));
        menu.set(23, Menu.item(Material.GOLD_INGOT, t("<yellow><b>Banque"), List.of(
                t("<gray>Solde : <white><s>", "s", plugin.bank().available() ? plugin.bank().format(f.bank) : "indisponible"),
                t("<gray>/f banque deposer|retirer <montant>"))), null);
        menu.set(24, Menu.item(Material.IRON_SWORD, t("<red><b>Relations"), List.of(t("<gray>Alliés, trêves, ennemis"), t("<yellow>Clic : afficher"))),
                (pl, c) -> run(pl, "f relations"));
        menu.set(25, Menu.item(Material.COMPARATOR, t("<white><b>Permissions"), List.of(t("<gray>Qui peut faire quoi"), t("<yellow>Clic : régler"))),
                (pl, c) -> openPerms(pl));

        menu.set(28, Menu.item(Material.SHIELD, t("<aqua><b>Bouclier"), List.of(
                t("<gray>Plage : <white><w>", "w", ShieldWindow.describe(f.shieldStart, plugin.settings().shieldHours)),
                t("<gray>/f bouclier <heure>"))), (pl, c) -> run(pl, "f bouclier"));
        menu.set(29, Menu.item(Material.FEATHER, t("<white><b>Vol"), List.of(
                t(fp.flying ? "<green>Activé" : "<gray>Désactivé"), t("<yellow>Clic : basculer"))), (pl, c) -> run(pl, "f fly"));
        menu.set(30, Menu.item(Material.GRASS_BLOCK, t("<green><b>Claim ici"), List.of(t("<gray>Prendre ce chunk (ou le surclaim)"), t("<yellow>Clic : claim"))),
                (pl, c) -> run(pl, "f claim"));
        menu.set(31, Menu.item(Material.GLASS, t("<white><b>Bordures"), List.of(t("<gray>Voir les limites du chunk"), t("<yellow>Clic : basculer"))),
                (pl, c) -> run(pl, "f voir"));
        menu.set(32, Menu.item(Material.DIAMOND, t("<aqua><b>Classement"), List.of(t("<gray>Top power, pillages, surclaims"), t("<yellow>Clic : afficher"))),
                (pl, c) -> run(pl, "f top"));
        menu.set(33, Menu.item(Material.OBSIDIAN, t("<dark_purple><b>Pillage"), List.of(
                t("<gray>Pillages : <white><v1></white> réussis, <white><v2></white> subis", "v1", f.raidsDone, "v2", f.raidsSuffered),
                t("<gray>Surclaims : <white><v1></white> faits, <white><v2></white> subis", "v1", f.overclaimsDone, "v2", f.overclaimsSuffered),
                t("<gray>Blocs détruits : <white><v1>", "v1", f.blocksDestroyed))), null);
        menu.set(34, Menu.item(Material.OAK_SIGN, t("<yellow><b>Chat"), List.of(
                t("<gray>Mode : <white><m>", "m", fp.chatMode.name().toLowerCase()), t("<yellow>Clic : changer"))), (pl, c) -> run(pl, "f chat"));
        var war = plugin.wars().warOf(f);
        menu.set(39, Menu.item(Material.WRITABLE_BOOK, t("<gold><b>Journal"), List.of(
                t("<gray>Coffre, banque, membres, pillages"), t("<yellow>Clic : lire"))), (pl, c) -> run(pl, "f logs"));
        menu.set(41, Menu.item(Material.NETHERITE_SWORD, t("<red><b>Guerre officielle"), List.of(
                t(war == null ? "<gray>Aucune guerre en cours" : "<white><l>", "l", war == null ? "" : war.attackerName + " " + war.attackerScore + "-" + war.defenderScore + " " + war.defenderName),
                t("<gray>/f guerre declarer ‹faction›"), t("<yellow>Clic : état"))), (pl, c) -> run(pl, "f guerre"));
        menu.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    private void openNoFaction(Player p) {
        Menu menu = new Menu(3, Msg.get("menu.title-none"));
        menu.set(11, Menu.item(Material.WHITE_BANNER, t("<gold><b>Fonder une faction"), List.of(t("<gray>/f creer <nom>"), t("<yellow>Clic : préparer la commande"))),
                (pl, c) -> {
                    pl.closeInventory();
                    pl.sendMessage(Msg.parse("<gray>» <click:suggest_command:'/f creer '><yellow><u>Clique ici</u></yellow></click> puis tape le nom de ta faction."));
                });
        menu.set(13, Menu.item(Material.BOOK, t("<aqua><b>Liste des factions"), List.of(t("<yellow>Clic : afficher"))), (pl, c) -> run(pl, "f liste"));
        List<Component> inv = new ArrayList<>();
        for (Faction o : m().playerFactions()) if (o.invites.containsKey(p.getUniqueId())) inv.add(t("<white>• <n>", "n", o.name));
        if (inv.isEmpty()) inv.add(t("<gray>Aucune invitation"));
        menu.set(15, Menu.item(Material.PAPER, t("<green><b>Invitations"), inv), null);
        menu.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    public void openMembers(Player p) {
        Faction f = m().factionOf(p);
        if (f == null) return;
        int rows = Math.max(2, Math.min(6, (f.members.size() + 8) / 9 + 1));
        Menu menu = new Menu(rows, Msg.get("menu.members-title", "faction", f.name));
        int slot = 0;
        List<Map.Entry<UUID, Role>> list = new ArrayList<>(f.members.entrySet());
        list.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        for (Map.Entry<UUID, Role> e : list) {
            if (slot >= (rows - 1) * 9) break;
            UUID u = e.getKey();
            String name = m().nameOf(u);
            OfflinePlayer op = Bukkit.getOfflinePlayer(u);
            ItemStack head = Menu.item(Material.PLAYER_HEAD, t((op.isOnline() ? "<green>" : "<gray>") + "<rk> <n>", "rk", e.getValue().prefix(), "n", name), List.of(
                    t("<gray>Rang : <white><rk>", "rk", e.getValue().label()),
                    t("<gray>Power : <white><p>", "p", Msg.fmt(m().playerPower(u))),
                    Component.empty(),
                    t("<yellow>Clic gauche : promouvoir"),
                    t("<yellow>Clic droit : rétrograder"),
                    t("<red>Maj + clic : expulser")));
            SkullMeta sm = (SkullMeta) head.getItemMeta();
            sm.setOwningPlayer(op);
            head.setItemMeta(sm);
            menu.set(slot++, head, (pl, c) -> {
                String sub = c.isShiftClick() ? "expulser" : c == ClickType.RIGHT ? "retrograder" : "promouvoir";
                pl.closeInventory();
                pl.performCommand("f " + sub + " " + name);
            });
        }
        menu.set((rows - 1) * 9 + 4, Menu.item(Material.ARROW, t("<gray>Retour"), List.of()), (pl, c) -> openMain(pl));
        menu.fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    public void openPerms(Player p) {
        Faction f = m().factionOf(p);
        if (f == null) return;
        boolean leader = f.role(p.getUniqueId()) == Role.CHEF;
        Menu menu = new Menu(3, Msg.get("menu.perms-title"));
        // 17 permissions + retour : tient sur 3 lignes.
        int slot = 0;
        for (FPerm perm : FPerm.values()) {
            Role r = f.permRole(perm);
            List<Component> lore = new ArrayList<>();
            for (Role role : Role.values()) {
                lore.add(t((role.atLeast(r) ? "<green>✔ " : "<red>✘ ") + "<white><n>", "n", role.label()));
            }
            lore.add(Component.empty());
            lore.add(t(leader ? "<yellow>Clic gauche : ouvrir à un rang de moins" : "<gray>Réservé au chef"));
            if (leader) lore.add(t("<yellow>Clic droit : réserver à un rang de plus"));
            menu.set(slot++, Menu.item(iconFor(perm), t("<gold><b><n>", "n", perm.label()), lore), leader ? (pl, c) -> {
                Role cur = f.permRole(perm);
                Role next = c.isRightClick() ? cur.next() : cur.previous();
                f.perms.put(perm, next);
                m().markDirty();
                openPerms(pl);
            } : null);
        }
        menu.set(22, Menu.item(Material.ARROW, t("<gray>Retour"), List.of()), (pl, c) -> openMain(pl));
        menu.fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    private static Material iconFor(FPerm p) {
        return switch (p) {
            case BUILD -> Material.BRICKS;
            case CONTAINER -> Material.CHEST;
            case DOOR -> Material.OAK_DOOR;
            case INVITE -> Material.WRITABLE_BOOK;
            case KICK -> Material.IRON_BOOTS;
            case CLAIM -> Material.GRASS_BLOCK;
            case UNCLAIM -> Material.DEAD_BUSH;
            case HOME -> Material.RED_BED;
            case SETHOME -> Material.COMPASS;
            case WARP -> Material.ENDER_PEARL;
            case SETWARP -> Material.ENDER_EYE;
            case CHEST -> Material.ENDER_CHEST;
            case BANK_WITHDRAW -> Material.GOLD_INGOT;
            case RELATION -> Material.IRON_SWORD;
            case FLY -> Material.FEATHER;
            case SHIELD -> Material.SHIELD;
            case LOGS -> Material.WRITABLE_BOOK;
        };
    }
}
