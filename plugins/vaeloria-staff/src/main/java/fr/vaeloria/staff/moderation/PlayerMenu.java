package fr.vaeloria.staff.moderation;

import fr.vaeloria.staff.Perm;
import fr.vaeloria.staff.VaeloriaStaffPlugin;
import fr.vaeloria.staff.gui.Menu;
import fr.vaeloria.staff.util.Durations;
import fr.vaeloria.staff.util.Items;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.SkullMeta;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

/** Fiche d'un joueur : infos, téléportation, freeze, inventaires, sanctions. */
public final class PlayerMenu extends Menu {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());

    private final VaeloriaStaffPlugin plugin;
    private final Player target;

    public PlayerMenu(VaeloriaStaffPlugin plugin, Player viewer, Player target) {
        super(viewer, 5, "&8Joueur · " + target.getName());
        this.plugin = plugin;
        this.target = target;
    }

    /** Tête du joueur avec ses informations principales. */
    static ItemStack head(VaeloriaStaffPlugin plugin, Player target, String... extra) {
        Location l = target.getLocation();
        List<String> lore = new ArrayList<>();
        lore.add("&7Vie : &f" + Math.round(target.getHealth()) + " &8· &7Faim : &f" + target.getFoodLevel());
        lore.add("&7Mode : &f" + target.getGameMode().name().toLowerCase() + " &8· &7Ping : &f" + target.getPing() + " ms");
        lore.add("&7Position : &f" + l.getWorld().getName() + " " + l.getBlockX() + " " + l.getBlockY() + " " + l.getBlockZ());
        lore.add("&7Première connexion : &f" + DATE.format(Instant.ofEpochMilli(target.getFirstPlayed())));
        List<String> states = new ArrayList<>();
        if (plugin.freeze().is(target)) states.add("&bimmobilisé");
        if (plugin.mutes().get(target.getUniqueId()) != null) states.add("&cmuet");
        if (plugin.vanish().is(target)) states.add("&dinvisible");
        if (plugin.staffMode().is(target)) states.add("&6mode staff");
        if (!states.isEmpty()) lore.add("&7État : " + String.join("&8, ", states));
        lore.addAll(List.of(extra));
        ItemStack head = Items.icon(Material.PLAYER_HEAD, "&f" + target.getName(), lore.toArray(String[]::new));
        SkullMeta meta = (SkullMeta) head.getItemMeta();
        meta.setOwningPlayer(target);
        head.setItemMeta(meta);
        return head;
    }

    @Override
    protected void render() {
        if (!target.isOnline()) {
            set(22, Items.icon(Material.BARRIER, "&c" + target.getName() + " s'est déconnecté"), e -> new PlayersMenu(plugin, viewer).open());
            set(36, Items.icon(Material.ARROW, "&fRetour"), e -> new PlayersMenu(plugin, viewer).open());
            fillEmpty();
            return;
        }
        set(4, head(plugin, target));

        if (viewer.hasPermission(Perm.TELEPORT)) {
            set(10, Items.icon(Material.ENDER_PEARL, "&eSe téléporter à lui"), e -> {
                viewer.closeInventory();
                viewer.teleport(target);
            });
            set(11, Items.icon(Material.LEAD, "&eLe téléporter ici"), e -> {
                viewer.closeInventory();
                target.teleport(viewer);
                plugin.notifyStaff(viewer.getName() + " a téléporté &f" + target.getName() + " &7à lui");
            });
        }
        if (viewer.hasPermission(Perm.FREEZE)) {
            boolean frozen = plugin.freeze().is(target);
            set(12, Items.icon(frozen ? Material.BLUE_ICE : Material.PACKED_ICE, frozen ? "&bLibérer" : "&bImmobiliser",
                    "&7Bloque déplacements, commandes, combat."), e -> {
                plugin.freeze().toggle(viewer, target);
                redraw();
            });
        }
        if (viewer.hasPermission(Perm.INVSEE)) {
            set(13, Items.icon(Material.CHEST, "&6Inventaire", viewer.hasPermission(Perm.INVSEE_EDIT) && !plugin.staffMode().is(viewer)
                    ? "&7Modifiable" : "&7Lecture seule"), e -> plugin.openInventory(viewer, target, false));
            set(14, Items.icon(Material.ENDER_CHEST, "&5Coffre de l'Ender"), e -> plugin.openInventory(viewer, target, true));
        }
        if (viewer.hasPermission(Perm.MODE)) {
            set(15, Items.icon(Material.GOLDEN_APPLE, "&aSoigner et nourrir"), e -> {
                AttributeInstance max = target.getAttribute(Attribute.MAX_HEALTH);
                target.setHealth(max == null ? 20 : max.getValue());
                target.setFoodLevel(20);
                target.setSaturation(20);
                target.setFireTicks(0);
                plugin.msg(viewer, target.getName() + " a été soigné.");
                redraw();
            });
        }

        if (viewer.hasPermission(Perm.WARN)) {
            set(28, Items.icon(Material.YELLOW_DYE, "&eAvertir", "&7Titre à l'écran + message."), e ->
                    reason("Raison de l'avertissement ?", r -> plugin.sanctions().warn(viewer, target, r)));
        }
        if (viewer.hasPermission(Perm.MUTE)) {
            Mutes.Mute mute = plugin.mutes().get(target.getUniqueId());
            if (mute == null) {
                set(29, Items.icon(Material.ORANGE_DYE, "&6Rendre muet", "&7Ex. : &f30m Spam&7, &f1d Insultes&7, &fperm Pub"), e ->
                        timed("Durée et raison du mute ?", (d, r) -> plugin.sanctions().mute(viewer, target, d, r)));
            } else {
                set(29, Items.icon(Material.LIME_DYE, "&aRendre la parole", "&7Muet : &f" + mute.reason(), "&7Par : &f" + mute.by()), e -> {
                    plugin.sanctions().unmute(viewer, target);
                    redraw();
                });
            }
        }
        if (viewer.hasPermission(Perm.KICK)) {
            set(30, Items.icon(Material.IRON_DOOR, "&cExpulser"), e ->
                    reason("Raison de l'expulsion ?", r -> plugin.sanctions().kick(viewer, target, r)));
        }
        if (viewer.hasPermission(Perm.BAN)) {
            set(31, Items.icon(Material.NETHERITE_AXE, "&4Bannir", "&7Ex. : &f7d Triche&7, &fperm Cheat"), e ->
                    timed("Durée et raison du bannissement ?", (d, r) -> plugin.sanctions().ban(viewer, target, d, r)));
        }

        set(36, Items.icon(Material.ARROW, "&fRetour"), e -> new PlayersMenu(plugin, viewer).open());
        set(44, Items.icon(Material.CLOCK, "&fActualiser"), e -> redraw());
        fillEmpty();
    }

    private void reason(String question, Consumer<String> action) {
        plugin.prompts().ask(viewer, question, r -> {
            if (!target.isOnline()) {
                plugin.msg(viewer, "&c" + target.getName() + " s'est déconnecté.");
                return;
            }
            action.accept(r);
            if (target.isOnline()) open();
        }, this::open);
    }

    /** « 1h Spam » → durée + raison. */
    private void timed(String question, BiConsumer<Duration, String> action) {
        plugin.prompts().ask(viewer, question + " &8(ex. &71h Spam&8, &7perm Triche&8)", input -> {
            String[] parts = input.trim().split("\\s+", 2);
            Duration d;
            try {
                d = Durations.parse(parts[0]);
            } catch (IllegalArgumentException ex) {
                plugin.msg(viewer, "&cDurée illisible : &f" + parts[0] + " &c(ex. 30m, 2h, 7d, perm).");
                open();
                return;
            }
            String reason = parts.length > 1 ? parts[1] : plugin.getConfig().getString("sanctions.default-reason", "Non-respect du règlement");
            action.accept(d, reason);
            if (target.isOnline()) open();
        }, this::open);
    }
}
