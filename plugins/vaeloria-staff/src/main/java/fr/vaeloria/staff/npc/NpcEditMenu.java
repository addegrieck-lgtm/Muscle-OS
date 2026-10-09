package fr.vaeloria.staff.npc;

import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.ConfirmMenu;
import fr.vaeloria.staff.gui.LinesMenu;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.List;

public final class NpcEditMenu extends Menu {
    private final VaeloriaStaffPlugin plugin;
    private final Npc npc;

    public NpcEditMenu(VaeloriaStaffPlugin plugin, Player viewer, Npc npc) {
        super(viewer, 4, "&8PNJ · " + npc.id());
        this.plugin = plugin;
        this.npc = npc;
    }

    private void update() {
        plugin.npcs().update(npc);
        redraw();
    }

    @Override
    protected void render() {
        set(4, Items.icon(NpcsMenu.icon(npc), "&f" + npc.name(), "&7Position : &f" + npc.pos().describe()));

        set(10, Items.icon(Material.NAME_TAG, "&eRenommer", "&7Nom actuel : &f" + npc.name()), e ->
                plugin.prompts().ask(viewer, "Nouveau nom ?", s -> {
                    npc.name(s);
                    plugin.npcs().update(npc);
                    open();
                }, this::open));
        set(11, Items.icon(NpcsMenu.icon(npc), "&eApparence : &f" + npc.type().name().toLowerCase(),
                "&eClic gauche &7: suivante", "&eClic droit &7: précédente"), e -> {
            List<EntityType> types = NpcManager.TYPES;
            int i = Math.max(0, types.indexOf(npc.type()));
            npc.type(types.get((i + (e.isRightClick() ? types.size() - 1 : 1)) % types.size()));
            update();
        });
        set(12, Items.icon(Material.WRITABLE_BOOK, "&eMessages au clic &7(" + npc.messages().size() + ")",
                lines("&7Explications, règles d'un jeu…", npc.messages())), e ->
                new LinesMenu(plugin, viewer, "&8Messages · " + npc.id(), npc.messages(), 30,
                        "{player} = pseudo du joueur.", () -> plugin.npcs().save(), this::open).open());
        set(13, Items.icon(Material.COMMAND_BLOCK, "&eCommandes au clic &7(" + npc.commands().size() + ")",
                lines("&7Lancées par le joueur, ou par la console\n&7si la ligne commence par &f[console]&7.", npc.commands())), e ->
                new LinesMenu(plugin, viewer, "&8Commandes · " + npc.id(), npc.commands(), 20,
                        "Ex. : warp arene · [console] give {player} bread 1", () -> plugin.npcs().save(), this::open).open());
        set(14, Items.icon(npc.glowing() ? Material.GLOWSTONE_DUST : Material.GUNPOWDER,
                "&eContour lumineux : " + (npc.glowing() ? "&aoui" : "&cnon"), "&eClic &7pour changer"), e -> {
            npc.glowing(!npc.glowing());
            update();
        });
        set(15, Items.icon(Material.OAK_SIGN, "&eNom visible : " + (npc.nameVisible() ? "&aoui" : "&cnon"), "&eClic &7pour changer"), e -> {
            npc.nameVisible(!npc.nameVisible());
            update();
        });
        set(16, Items.icon(Material.ENDER_PEARL, "&eDéplacer ici", "&7À ta position, tourné comme toi."), e -> {
            Location at = viewer.getLocation();
            at.setPitch(0);
            plugin.npcs().move(npc, at);
            redraw();
        });
        set(22, Items.icon(Material.SPYGLASS, "&bTester le clic", "&7Exécute ses actions pour toi."), e -> {
            viewer.closeInventory();
            plugin.npcs().interact(npc, viewer);
        });
        set(23, Items.icon(Material.ENDER_EYE, "&eSe téléporter"), e -> {
            Location at = npc.pos().toLocation();
            if (at != null) viewer.teleport(at.clone().add(at.getDirection().multiply(2)).setDirection(at.getDirection().multiply(-1)));
        });

        set(27, Items.icon(Material.ARROW, "&fRetour"), e -> new NpcsMenu(plugin, viewer).open());
        set(35, Items.icon(Material.LAVA_BUCKET, "&cSupprimer"), e -> new ConfirmMenu(viewer, "Supprimer le PNJ " + npc.id() + " ?", () -> {
            plugin.npcs().delete(npc);
            new NpcsMenu(plugin, viewer).open();
        }, this::open).open());
        fillEmpty();
    }

    private static String[] lines(String help, List<String> values) {
        List<String> out = new ArrayList<>(List.of(help.split("\n")));
        out.add("");
        values.stream().limit(6).forEach(v -> out.add("&8│ &r" + v));
        if (values.size() > 6) out.add("&8│ …");
        out.add("");
        out.add("&eClic &7pour modifier");
        return out.toArray(String[]::new);
    }
}
