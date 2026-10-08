package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.TotemDef;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.service.TotemService;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Interface d'administration du Totem (/f totem admin) : totems, horaires, gains et réglages.
 * Chaque modification est écrite dans config.yml et appliquée immédiatement.
 */
public final class TotemAdminMenu {
    private static final String[] DAYS = {"LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE", "TOUS"};
    private static final Material[] SWORDS = {Material.DIAMOND_SWORD, Material.NETHERITE_SWORD, Material.IRON_SWORD, null};

    private final VaeloriaFactionsPlugin plugin;

    public TotemAdminMenu(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private Settings s() { return plugin.settings(); }
    private TotemService t() { return plugin.totems(); }

    private static Component c(String mini, Object... kv) { return Msg.parse(mini, kv); }

    private static void say(Player p, String mini, Object... kv) { p.sendMessage(Msg.parse("<prefix>" + mini, kv)); }

    private void set(String path, Object value) { plugin.setConfigValue(path, value); }

    private static Menu back(Menu m, int slot, java.util.function.Consumer<Player> to) {
        return m.set(slot, Menu.item(Material.ARROW, c("<gray>Retour"), List.of()), (pl, ct) -> to.accept(pl));
    }

    // ── Accueil ──

    public void open(Player p) {
        Menu m = new Menu(6, c("<dark_purple>Totem · Administration"));
        TotemDef act = t().activeDef();
        m.set(4, Menu.item(act == null ? Material.GRAY_DYE : Material.END_CRYSTAL,
                c(act == null ? "<gray><b>Aucun totem en cours" : "<light_purple><b>Totem en cours : <n>", "n", act == null ? "" : act.name),
                List.of(t().status())), null);
        m.set(19, Menu.item(Material.OBSIDIAN, c("<dark_purple><b>Totems"), List.of(
                c("<gray><n> totem(s) défini(s)", "n", t().definitions().size()),
                c("<gray>Lancer, se téléporter, créer, supprimer"), c("<yellow>Clic : ouvrir"))), (pl, ct) -> openTotems(pl));
        m.set(21, Menu.item(Material.CLOCK, c("<gold><b>Horaires"), scheduleLore()), (pl, ct) -> openSchedule(pl));
        m.set(23, Menu.item(Material.GOLD_BLOCK, c("<yellow><b>Gains"), List.of(
                c("<gray>Banque : <white><v>", "v", plugin.bank().format(s().totemRewardMoney)),
                c("<gray>Power de faction : <white>+<v>", "v", Msg.fmt(s().totemRewardPower)),
                c("<gray>Commandes : <white><v>", "v", s().totemRewardCommands.size()),
                c("<yellow>Clic : modifier"))), (pl, ct) -> openRewards(pl));
        m.set(25, Menu.item(Material.COMPARATOR, c("<white><b>Réglages"), List.of(
                c("<gray>Casse : <white><v> s</white> à <white><it></white>", "v", Msg.fmt(s().totemBreakSeconds), "it", t().itemName()),
                c("<gray>Durée <white><v> min</white>, hauteur <white><h></white>", "v", s().totemDurationMinutes, "h", s().totemHeight),
                c("<yellow>Clic : modifier"))), (pl, ct) -> openSettings(pl));
        m.set(39, Menu.item(Material.LIME_CONCRETE, c("<green><b>Lancer un totem"), List.of(
                c("<gray>Choisir lequel et le lancer maintenant"), c("<gray>(durée : <v> min)", "v", s().totemDurationMinutes))), (pl, ct) -> openTotems(pl));
        m.set(41, Menu.item(Material.RED_CONCRETE, c("<red><b>Arrêter le totem"), List.of(c("<gray>Sans vainqueur"))), (pl, ct) -> {
            if (!t().isActive()) say(pl, "<gray>Aucun totem en cours.");
            else t().stop(false);
            open(pl);
        });
        m.set(49, Menu.item(Material.BARRIER, c("<red>Fermer"), List.of()), (pl, ct) -> pl.closeInventory());
        m.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    private List<Component> scheduleLore() {
        List<Component> l = new ArrayList<>();
        List<String> raw = plugin.getConfig().getStringList("totem.schedule");
        if (raw.isEmpty()) l.add(c("<gray>Aucun lancement automatique"));
        for (String r : raw) l.add(c("<white>• <v>", "v", pretty(r)));
        l.add(c("<gray>Minimum <white><v></white> joueurs connectés", "v", s().totemMinOnline));
        l.add(c("<yellow>Clic : modifier"));
        return l;
    }

    private static String pretty(String raw) {
        TotemSchedule.Entry e = TotemSchedule.parse(raw);
        if (e == null) return raw + " (illisible)";
        String day = e.day() == null ? "Tous les jours" : e.day().getDisplayName(java.time.format.TextStyle.FULL, Locale.FRENCH);
        day = day.substring(0, 1).toUpperCase(Locale.ROOT) + day.substring(1);
        return day + " " + String.format("%02dh%02d", e.hour(), e.minute()) + (e.totem() == null ? "" : " — " + e.totem());
    }

    // ── Totems ──

    public void openTotems(Player p) {
        Menu m = new Menu(4, c("<dark_purple>Totem · Totems"));
        int slot = 0;
        for (TotemDef d : t().definitions()) {
            if (slot >= 27) break;
            m.set(slot++, Menu.item(Material.OBSIDIAN, c("<light_purple><b><n>", "n", d.name), List.of(
                    c("<gray><w> <x>, <y>, <z>", "w", d.world, "x", d.x, "y", d.y, "z", d.z),
                    Component.empty(),
                    c("<green>Clic gauche : lancer maintenant"),
                    c("<aqua>Clic droit : s'y téléporter"),
                    c("<red>Maj + clic droit : supprimer"))), (pl, ct) -> {
                if (ct == ClickType.SHIFT_RIGHT) {
                    plugin.prompts().ask(pl, "Tape « supprimer " + d.name + " » pour confirmer la suppression.", txt -> {
                        if (txt.equalsIgnoreCase("supprimer " + d.name)) {
                            t().delete(d.name);
                            say(pl, "<green>Totem <white><n></white> supprimé.", "n", d.name);
                        } else say(pl, "<gray>Suppression annulée.");
                        openTotems(pl);
                    });
                } else if (ct.isRightClick()) {
                    var w = d.bukkitWorld();
                    if (w != null) pl.teleportAsync(new org.bukkit.Location(w, d.x + 2.5, d.y, d.z + 0.5));
                    pl.closeInventory();
                } else {
                    var r = t().start(d.name, 0, false);
                    if (r != TotemService.StartResult.OK) pl.sendMessage(Msg.prefixed("totem.start-fail." + r.name().toLowerCase(Locale.ROOT), "totem", d.name));
                    open(pl);
                }
            });
        }
        if (slot == 0) m.set(13, Menu.item(Material.PAPER, c("<gray>Aucun totem"), List.of(c("<gray>Crée le premier avec le bouton vert"))), null);
        m.set(31, Menu.item(Material.EMERALD, c("<green><b>Créer un totem ici"), List.of(
                c("<gray>La colonne part du bloc sous tes pieds"), c("<gray>(<h> blocs vers le haut)", "h", s().totemHeight),
                c("<yellow>Clic : choisir le nom"))), (pl, ct) -> plugin.prompts().ask(pl, "Nom du nouveau totem (lettres, chiffres, - et _) :", name -> {
            if (!name.matches("[A-Za-z0-9_-]{2,24}")) {
                say(pl, "<red>Nom invalide.");
                return;
            }
            var base = pl.getLocation().getBlock();
            if (t().create(name, base)) say(pl, "<green>Totem <white><n></white> créé en <x>, <y>, <z>. <gray>Pense à la warzone : <white>/f admin warzone 2",
                    "n", name, "x", base.getX(), "y", base.getY(), "z", base.getZ());
            else say(pl, "<red>Ce nom existe déjà.");
            openTotems(pl);
        }));
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Horaires ──

    public void openSchedule(Player p) {
        Menu m = new Menu(4, c("<gold>Totem · Horaires"));
        List<String> raw = new ArrayList<>(plugin.getConfig().getStringList("totem.schedule"));
        for (int i = 0; i < raw.size() && i < 18; i++) {
            String entry = raw.get(i);
            m.set(i, Menu.item(Material.CLOCK, c("<gold><v>", "v", pretty(entry)), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(plugin.getConfig().getStringList("totem.schedule"));
                l.remove(entry);
                set("totem.schedule", l);
                say(pl, "<gray>Horaire supprimé : <white><v>", "v", pretty(entry));
                openSchedule(pl);
            });
        }
        m.set(22, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter un horaire"), List.of(c("<gray>Choisir le jour, puis l'heure"))), (pl, ct) -> openDayPicker(pl));
        m.set(24, Menu.item(Material.PLAYER_HEAD, c("<white><b>Joueurs minimum : <v>", "v", s().totemMinOnline), List.of(
                c("<gray>Pour un lancement automatique"), c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("totem.min-online", Math.max(0, s().totemMinOnline + (ct.isRightClick() ? -step : step)));
            openSchedule(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    private void openDayPicker(Player p) {
        Menu m = new Menu(2, c("<gold>Totem · Quel jour ?"));
        for (int i = 0; i < DAYS.length; i++) {
            String day = DAYS[i];
            String label = day.equals("TOUS") ? "Tous les jours" : day.charAt(0) + day.substring(1).toLowerCase(Locale.ROOT);
            m.set(i, Menu.item(day.equals("TOUS") ? Material.SUNFLOWER : Material.PAPER, c("<gold><v>", "v", label), List.of()), (pl, ct) ->
                    plugin.prompts().ask(pl, "Heure pour « " + label + " » (ex. 21:00), suivie si tu veux du nom d'un totem :", txt -> {
                        String line = day + " " + txt.trim();
                        TotemSchedule.Entry e = TotemSchedule.parse(line);
                        if (e == null) {
                            say(pl, "<red>Heure illisible : utilise le format 21:00 ou 20h30.");
                            return;
                        }
                        if (e.totem() != null && t().get(e.totem()) == null) {
                            say(pl, "<red>Totem inconnu : <white><v>", "v", e.totem());
                            return;
                        }
                        List<String> l = new ArrayList<>(plugin.getConfig().getStringList("totem.schedule"));
                        l.add(line);
                        set("totem.schedule", l);
                        say(pl, "<green>Horaire ajouté : <white><v>", "v", pretty(line));
                        openSchedule(pl);
                    }));
        }
        back(m, 13, this::openSchedule).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Gains ──

    public void openRewards(Player p) {
        Menu m = new Menu(4, c("<yellow>Totem · Gains"));
        m.set(10, Menu.item(Material.GOLD_INGOT, c("<yellow><b>Argent en banque : <v>", "v", plugin.bank().format(s().totemRewardMoney)), List.of(
                c("<gray>Versé à la faction gagnante"),
                c("<yellow>Gauche +1000 · Droit -1000"), c("<yellow>Maj + clic : montant exact"))), (pl, ct) -> {
            if (ct.isShiftClick()) {
                plugin.prompts().ask(pl, "Montant versé à la faction gagnante :", txt -> {
                    try {
                        double v = Double.parseDouble(txt.replace(',', '.').replace(" ", ""));
                        if (v < 0 || Double.isInfinite(v) || Double.isNaN(v)) throw new NumberFormatException();
                        set("totem.reward.money", v);
                        say(pl, "<green>Gain en banque : <white><v>", "v", plugin.bank().format(v));
                    } catch (NumberFormatException e) {
                        say(pl, "<red>Montant invalide.");
                    }
                    openRewards(pl);
                });
                return;
            }
            set("totem.reward.money", Math.max(0, s().totemRewardMoney + (ct.isRightClick() ? -1000 : 1000)));
            openRewards(pl);
        });
        m.set(12, Menu.item(Material.BLAZE_POWDER, c("<gold><b>Power de faction : +<v>", "v", Msg.fmt(s().totemRewardPower)), List.of(
                c("<gray>Bonus de power permanent pour la faction gagnante"),
                c("<yellow>Gauche +1 · Droit -1"))), (pl, ct) -> {
            set("totem.reward.power-boost", Math.max(0, s().totemRewardPower + (ct.isRightClick() ? -1 : 1)));
            openRewards(pl);
        });
        List<String> cmds = new ArrayList<>(s().totemRewardCommands);
        int slot = 18;
        for (String cmd : cmds) {
            if (slot > 25) break;
            m.set(slot++, Menu.item(Material.COMMAND_BLOCK, c("<white>/<v>", "v", cmd), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(s().totemRewardCommands);
                l.remove(cmd);
                set("totem.reward.commands", l);
                openRewards(pl);
            });
        }
        m.set(14, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter une commande"), List.of(
                c("<gray>Exécutée par la console à la victoire"),
                c("<gray>{player} = dernier coup, {faction}, {totem}"),
                c("<gray>ex. <white>crate key give {player} totem 1"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Commande à exécuter (sans le /) :", txt -> {
                    String cmd = txt.startsWith("/") ? txt.substring(1) : txt;
                    if (cmd.isBlank()) return;
                    List<String> l = new ArrayList<>(s().totemRewardCommands);
                    l.add(cmd);
                    set("totem.reward.commands", l);
                    say(pl, "<green>Commande ajoutée : <white>/<v>", "v", cmd);
                    openRewards(pl);
                }));
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Réglages ──

    public void openSettings(Player p) {
        Menu m = new Menu(4, c("<white>Totem · Réglages"));
        m.set(10, Menu.item(s().totemEnabled ? Material.LIME_DYE : Material.GRAY_DYE,
                c(s().totemEnabled ? "<green><b>Totem activé" : "<red><b>Totem désactivé"), List.of(c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set("totem.enabled", !s().totemEnabled);
            openSettings(pl);
        });
        m.set(11, Menu.item(Material.DIAMOND_PICKAXE, c("<aqua><b>Temps de casse : <v> s / bloc", "v", Msg.fmt(s().totemBreakSeconds)), List.of(
                c("<yellow>Gauche +0,5 s · Droit -0,5 s"))), (pl, ct) -> {
            set("totem.break-seconds", Math.max(0.5, s().totemBreakSeconds + (ct.isRightClick() ? -0.5 : 0.5)));
            openSettings(pl);
        });
        Material item = s().totemRequiredItem == null ? Material.BARRIER : s().totemRequiredItem;
        m.set(12, Menu.item(item, c("<aqua><b>Arme requise : <v>", "v", t().itemName()), List.of(
                c("<yellow>Clic : changer (diamant → netherite → fer → aucune)"))), (pl, ct) -> {
            int i = 0;
            while (i < SWORDS.length && SWORDS[i] != s().totemRequiredItem) i++;
            Material next = SWORDS[(i + 1) % SWORDS.length];
            set("totem.required-item", next == null ? "AUCUN" : next.name());
            openSettings(pl);
        });
        m.set(13, Menu.item(Material.CLOCK, c("<gold><b>Durée : <v> min", "v", s().totemDurationMinutes), List.of(
                c("<gray>Sans vainqueur à la fin, le totem s'effondre"), c("<yellow>Gauche +5 · Droit -5 · Maj ±1"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 1 : 5;
            set("totem.duration-minutes", Math.max(1, s().totemDurationMinutes + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        m.set(14, Menu.item(Material.OBSIDIAN, c("<dark_purple><b>Hauteur : <v> blocs", "v", s().totemHeight), List.of(
                c("<gray>Impossible pendant un totem en cours"), c("<yellow>Gauche +1 · Droit -1"))), (pl, ct) -> {
            if (t().isActive()) {
                say(pl, "<red>Arrête d'abord le totem en cours.");
                return;
            }
            int h = Math.max(1, Math.min(20, s().totemHeight + (ct.isRightClick() ? -1 : 1)));
            // On enlève les anciennes colonnes avant de changer la hauteur, puis on les reconstruit.
            t().clearAll();
            set("totem.height", h);
            t().rebuildAll();
            openSettings(pl);
        });
        m.set(15, Menu.item(Material.NAME_TAG, c(s().totemHologram ? "<green><b>Hologramme affiché" : "<gray><b>Hologramme masqué"),
                List.of(c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set("totem.hologram", !s().totemHologram);
            openSettings(pl);
        });
        m.set(16, Menu.item(Material.PLAYER_HEAD, c("<white><b>Joueurs minimum : <v>", "v", s().totemMinOnline), List.of(
                c("<gray>Pour les lancements automatiques"), c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("totem.min-online", Math.max(0, s().totemMinOnline + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }
}
