package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.FortressDef;
import fr.vaeloria.factions.model.Pos;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.service.FortressService;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Interface d'administration de la Forteresse (/f forteresse admin) : construction, configuration depuis le schéma,
 * positions personnalisées, lancement, portes, horaires, gains et réglages.
 */
public final class FortressAdminMenu {
    private static final String[] DAYS = {"LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE", "TOUS"};

    private final VaeloriaFactionsPlugin plugin;
    /** Sélection en cours (coin 1 / coin 2) de chaque membre du staff. */
    private final Map<UUID, Location[]> selection = new HashMap<>();

    public FortressAdminMenu(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private Settings s() { return plugin.settings(); }
    private FortressService fs() { return plugin.fortress(); }

    private static Component c(String mini, Object... kv) { return Msg.parse(mini, kv); }

    private static void say(Player p, String mini, Object... kv) { p.sendMessage(Msg.parse("<prefix>" + mini, kv)); }

    private void set(String path, Object value) { plugin.setConfigValue(path, value); }

    private static Menu back(Menu m, int slot, java.util.function.Consumer<Player> to) {
        return m.set(slot, Menu.item(Material.ARROW, c("<gray>Retour"), List.of()), (pl, ct) -> to.accept(pl));
    }

    private static String where(Pos p) {
        return p == null ? "non défini" : p.world + " " + (int) Math.floor(p.x) + ", " + (int) Math.floor(p.y) + ", " + (int) Math.floor(p.z);
    }

    // ── Accueil ──

    public void open(Player p) {
        Menu m = new Menu(6, c("<dark_red>Forteresse · Administration"));
        FortressDef d = fs().def();
        String state = switch (fs().phase()) {
            case IDLE -> "<gray>Aucune bataille en cours";
            case REGISTRATION -> "<yellow>Inscriptions ouvertes (" + fs().registered().size() + " inscrits)";
            case PREPARATION -> "<gold>Préparation dans les camps";
            case ASSAULT -> "<gold>Assaut : portes ouvertes";
            case CLOSED -> "<red>Portes fermées : bataille au sommet";
        };
        List<Component> info = new ArrayList<>();
        info.add(c(state));
        if (fs().phase() != FortressService.Phase.IDLE) info.add(c("<gray>Temps restant : <white><v>", "v", Msg.duration(fs().remaining())));
        info.add(c(d != null && d.ready() ? "<green>Forteresse configurée" : "<red>Forteresse non configurée"));
        if (d != null) {
            info.add(c("<gray>Origine : <white><v>", "v", where(d.origin)));
            info.add(c("<gray><g> porte(s), <n> camp(s)", "g", d.gates.size(), "n", d.camps.size()));
        }
        m.set(4, Menu.item(Material.RED_BANNER, c("<dark_red><b>Forteresse"), info), null);

        m.set(10, Menu.item(Material.LIME_CONCRETE, c("<green><b>Ouvrir les inscriptions"), List.of(
                c("<gray>Durée : <white><v> min", "v", s().fortressRegistrationMinutes),
                c("<gray>Puis camps, assaut, fermeture des portes"))), (pl, ct) -> {
            var r = fs().openRegistration(false);
            if (r != FortressService.StartResult.OK) pl.sendMessage(Msg.prefixed("fortress.start-fail." + r.name().toLowerCase(Locale.ROOT)));
            open(pl);
        });
        m.set(11, Menu.item(Material.RED_CONCRETE, c("<red><b>Arrêter"), List.of(c("<gray>Sans vainqueur, chacun rentre chez lui"))), (pl, ct) -> {
            fs().stop();
            open(pl);
        });
        m.set(13, Menu.item(Material.IRON_DOOR, c("<white><b>Ouvrir les portes"), List.of(c("<gray>Pour tester (hors bataille)"))), (pl, ct) -> {
            if (fs().running()) { say(pl, "<red>Bataille en cours : les portes suivent la partie."); return; }
            fs().setGates(true);
            say(pl, "<green>Portes ouvertes.");
        });
        m.set(14, Menu.item(Material.IRON_BARS, c("<white><b>Fermer les portes"), List.of(c("<gray>Remet les herses"))), (pl, ct) -> {
            if (fs().running()) { say(pl, "<red>Bataille en cours : les portes suivent la partie."); return; }
            fs().setGates(false);
            say(pl, "<gray>Portes fermées.");
        });
        m.set(15, Menu.item(Material.ENDER_PEARL, c("<aqua><b>Aller à la forteresse"), List.of(c("<gray>Téléportation au centre"))), (pl, ct) -> {
            FortressDef def = fs().def();
            Location l = def == null || def.origin == null ? null : def.origin.toLocation();
            if (l == null) { say(pl, "<red>Forteresse non configurée."); return; }
            pl.closeInventory();
            pl.teleportAsync(l);
        });
        m.set(16, Menu.item(Material.SPYGLASS, c("<white><b>Montrer les zones"), List.of(
                c("<green>vert<gray> : sommet · <gold>flammes<gray> : enceinte"), c("<white>blanc<gray> : portes · totems : camps"))), (pl, ct) -> {
            pl.closeInventory();
            fs().showZones(pl);
        });

        m.set(28, Menu.item(Material.BRICKS, c("<gold><b>Construire la forteresse ici"), List.of(
                c("<gray>Colle la forteresse et sa carte (241 × 241)"), c("<gray>centrées sur ta position, au niveau du sol"),
                c("<red>Écrase tout ce qui s'y trouve !"), c("<yellow>Clic : confirmer dans le chat"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Tape « construire » pour coller la forteresse ici (241 × 241 blocs, tout est écrasé).", txt -> {
                    if (!txt.trim().equalsIgnoreCase("construire")) { say(pl, "<gray>Annulé."); return; }
                    fs().build(pl, pl.getLocation());
                }));
        m.set(29, Menu.item(Material.MAP, c("<aqua><b>Configurer depuis le schéma"), List.of(
                c("<gray>Tu as collé forteresse.schem avec WorldEdit ?"), c("<gray>Tiens-toi là où tu étais pour le //paste,"),
                c("<gray>les portes, le sommet et les camps sont placés"), c("<yellow>Clic : configurer à ma position"))), (pl, ct) -> {
            try {
                fs().configureFromLayout(pl.getLocation());
                say(pl, "<green>Forteresse configurée autour de ta position. <gray>Vérifie avec « Montrer les zones ».");
            } catch (IOException | RuntimeException e) {
                say(pl, "<red>Configuration impossible : <v>", "v", String.valueOf(e.getMessage()));
            }
            open(pl);
        });
        m.set(30, Menu.item(Material.COMPASS, c("<white><b>Positions personnalisées"), List.of(
                c("<gray>Pour ta propre forteresse :"), c("<gray>sommet, enceinte, portes, camps, sortie"), c("<yellow>Clic : ouvrir"))), (pl, ct) -> openPositions(pl));

        m.set(32, Menu.item(Material.GOLD_BLOCK, c("<yellow><b>Gains"), List.of(
                c("<gray>Banque : <white><v>", "v", plugin.bank().format(s().fortressRewardMoney)),
                c("<gray>Commandes : <white><v>", "v", s().fortressRewardCommands.size()), c("<yellow>Clic : modifier"))), (pl, ct) -> openRewards(pl));
        m.set(33, Menu.item(Material.CLOCK, c("<gold><b>Horaires"), scheduleLore()), (pl, ct) -> openSchedule(pl));
        m.set(34, Menu.item(Material.COMPARATOR, c("<white><b>Réglages"), List.of(
                c("<gray>Durées, équipes, inventaire, power"), c("<yellow>Clic : modifier"))), (pl, ct) -> openSettings(pl));
        m.set(49, Menu.item(Material.BARRIER, c("<red>Fermer"), List.of()), (pl, ct) -> pl.closeInventory());
        m.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    // ── Positions personnalisées ──

    private FortressDef def(Player p) {
        FortressDef d = fs().def();
        if (d == null) {
            d = new FortressDef();
            d.world = p.getWorld().getName();
            d.origin = Pos.of(p.getLocation());
            plugin.state().fortress = d;
        }
        return d;
    }

    private FortressDef.Box selected(Player p) {
        Location[] sel = selection.get(p.getUniqueId());
        if (sel == null || sel[0] == null || sel[1] == null) {
            say(p, "<red>Choisis d'abord les deux coins (coin 1 et coin 2).");
            return null;
        }
        if (!sel[0].getWorld().equals(sel[1].getWorld())) {
            say(p, "<red>Les deux coins doivent être dans le même monde.");
            return null;
        }
        return FortressDef.Box.of(sel[0].getBlockX(), sel[0].getBlockY(), sel[0].getBlockZ(), sel[1].getBlockX(), sel[1].getBlockY(), sel[1].getBlockZ());
    }

    public void openPositions(Player p) {
        Menu m = new Menu(5, c("<white>Forteresse · Positions"));
        FortressDef d = fs().def();
        Location[] sel = selection.computeIfAbsent(p.getUniqueId(), k -> new Location[2]);
        m.set(1, Menu.item(Material.WOODEN_AXE, c("<white><b>Coin 1 : ici"), List.of(c("<gray><v>", "v", sel[0] == null ? "non choisi" : where(Pos.of(sel[0]))))), (pl, ct) -> {
            selection.get(pl.getUniqueId())[0] = pl.getLocation().getBlock().getLocation();
            openPositions(pl);
        });
        m.set(2, Menu.item(Material.STONE_AXE, c("<white><b>Coin 2 : ici"), List.of(c("<gray><v>", "v", sel[1] == null ? "non choisi" : where(Pos.of(sel[1]))))), (pl, ct) -> {
            selection.get(pl.getUniqueId())[1] = pl.getLocation().getBlock().getLocation();
            openPositions(pl);
        });
        m.set(4, Menu.item(Material.BOOK, c("<white><b>Comment faire ?"), List.of(
                c("<gray>1. Place-toi à un coin, clic « Coin 1 »"), c("<gray>2. À l'autre coin, clic « Coin 2 »"),
                c("<gray>3. Clique sur ce que la sélection doit devenir"),
                c("<gray>Une porte mémorise le bloc du coin 1 (ex. barreaux)"))), null);
        m.set(10, Menu.item(Material.GOLD_BLOCK, c("<green><b>Sélection → sommet"), List.of(
                c("<gray>Actuel : <white><v>", "v", d == null || d.summit == null ? "non défini" : d.summit.toString()))), (pl, ct) -> {
            FortressDef.Box b = selected(pl);
            if (b == null) return;
            FortressDef def = def(pl);
            def.summit = b;
            def.world = pl.getWorld().getName();
            plugin.manager().markDirty();
            say(pl, "<green>Sommet défini.");
            openPositions(pl);
        });
        m.set(11, Menu.item(Material.STONE_BRICKS, c("<gold><b>Sélection → enceinte"), List.of(
                c("<gray>L'intérieur des remparts"), c("<gray>Actuel : <white><v>", "v", d == null || d.area == null ? "non défini" : d.area.toString()))), (pl, ct) -> {
            FortressDef.Box b = selected(pl);
            if (b == null) return;
            def(pl).area = b;
            plugin.manager().markDirty();
            say(pl, "<green>Enceinte définie.");
            openPositions(pl);
        });
        m.set(12, Menu.item(Material.GRASS_BLOCK, c("<white><b>Sélection → carte protégée"), List.of(
                c("<gray>Ni construction, ni explosion, ni seau"), c("<gray>Actuel : <white><v>", "v", d == null || d.arena == null ? "aucune" : d.arena.toString()))), (pl, ct) -> {
            FortressDef.Box b = selected(pl);
            if (b == null) return;
            def(pl).arena = b;
            plugin.manager().markDirty();
            say(pl, "<green>Carte protégée définie.");
            openPositions(pl);
        });
        m.set(13, Menu.item(Material.IRON_BARS, c("<white><b>Sélection → nouvelle porte"), List.of(
                c("<gray>Fermée, elle reprend le bloc du coin 1"), c("<gray><v> porte(s)", "v", d == null ? 0 : d.gates.size()))), (pl, ct) -> {
            FortressDef.Box b = selected(pl);
            if (b == null) return;
            Location c1 = selection.get(pl.getUniqueId())[0];
            if (c1.getBlock().getType().isAir()) { say(pl, "<red>Le coin 1 doit être un bloc de la porte fermée (ex. barreaux)."); return; }
            if (b.volume() > 400) { say(pl, "<red>Porte trop grande (400 blocs maximum)."); return; }
            FortressDef def = def(pl);
            FortressDef.Gate g = new FortressDef.Gate();
            g.name = "porte-" + (def.gates.size() + 1);
            g.box = b;
            g.block = c1.getBlock().getBlockData().getAsString();
            def.gates.add(g);
            plugin.manager().markDirty();
            say(pl, "<green>Porte ajoutée (<v>).", "v", g.block);
            openPositions(pl);
        });
        m.set(14, Menu.item(Material.TNT, c("<red><b>Retirer toutes les portes"), List.of(c("<red>Maj + clic droit"))), (pl, ct) -> {
            if (ct != ClickType.SHIFT_RIGHT || fs().def() == null) return;
            fs().def().gates.clear();
            plugin.manager().markDirty();
            openPositions(pl);
        });
        m.set(19, Menu.item(Material.WHITE_BED, c("<aqua><b>Ajouter un camp ici"), List.of(
                c("<gray>Point d'apparition d'une équipe"), c("<gray><v> camp(s)", "v", d == null ? 0 : d.camps.size()))), (pl, ct) -> {
            def(pl).camps.add(Pos.of(pl.getLocation()));
            plugin.manager().markDirty();
            say(pl, "<green>Camp ajouté.");
            openPositions(pl);
        });
        m.set(20, Menu.item(Material.BARRIER, c("<red><b>Retirer tous les camps"), List.of(c("<red>Maj + clic droit"))), (pl, ct) -> {
            if (ct != ClickType.SHIFT_RIGHT || fs().def() == null) return;
            fs().def().camps.clear();
            plugin.manager().markDirty();
            openPositions(pl);
        });
        m.set(22, Menu.item(Material.OAK_DOOR, c("<white><b>Sortie ici"), List.of(
                c("<gray>Où l'on renvoie les intrus de l'enceinte"), c("<gray>Actuel : <white><v>", "v", d == null ? "non défini" : where(d.lobby)))), (pl, ct) -> {
            def(pl).lobby = Pos.of(pl.getLocation());
            plugin.manager().markDirty();
            say(pl, "<green>Sortie définie.");
            openPositions(pl);
        });
        m.set(24, Menu.item(Material.LECTERN, c("<white><b>Centre ici"), List.of(
                c("<gray>Point de téléportation du staff"), c("<gray>Actuel : <white><v>", "v", d == null ? "non défini" : where(d.origin)))), (pl, ct) -> {
            def(pl).origin = Pos.of(pl.getLocation());
            plugin.manager().markDirty();
            openPositions(pl);
        });
        back(m, 36, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Horaires ──

    private List<Component> scheduleLore() {
        List<Component> l = new ArrayList<>();
        List<String> raw = plugin.getConfig().getStringList("fortress.schedule");
        if (raw.isEmpty()) l.add(c("<gray>Aucun lancement automatique"));
        for (String r : raw) l.add(c("<white>• <v>", "v", pretty(r)));
        l.add(c("<gray>Minimum <white><v></white> joueurs connectés", "v", s().fortressMinOnline));
        l.add(c("<yellow>Clic : modifier"));
        return l;
    }

    private static String pretty(String raw) {
        TotemSchedule.Entry e = TotemSchedule.parse(raw);
        if (e == null) return raw + " (illisible)";
        String day = e.day() == null ? "Tous les jours" : e.day().getDisplayName(java.time.format.TextStyle.FULL, Locale.FRENCH);
        day = day.substring(0, 1).toUpperCase(Locale.ROOT) + day.substring(1);
        return day + " " + String.format("%02dh%02d", e.hour(), e.minute()) + " (ouverture des inscriptions)";
    }

    public void openSchedule(Player p) {
        Menu m = new Menu(4, c("<gold>Forteresse · Horaires"));
        List<String> raw = new ArrayList<>(plugin.getConfig().getStringList("fortress.schedule"));
        for (int i = 0; i < raw.size() && i < 18; i++) {
            String entry = raw.get(i);
            m.set(i, Menu.item(Material.CLOCK, c("<gold><v>", "v", pretty(entry)), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(plugin.getConfig().getStringList("fortress.schedule"));
                l.remove(entry);
                set("fortress.schedule", l);
                say(pl, "<gray>Horaire supprimé : <white><v>", "v", pretty(entry));
                openSchedule(pl);
            });
        }
        m.set(22, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter un horaire"), List.of(c("<gray>Choisir le jour, puis l'heure"))), (pl, ct) -> openDayPicker(pl));
        m.set(24, Menu.item(Material.PLAYER_HEAD, c("<white><b>Joueurs minimum : <v>", "v", s().fortressMinOnline), List.of(
                c("<gray>Pour un lancement automatique"), c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("fortress.min-online", Math.max(0, s().fortressMinOnline + (ct.isRightClick() ? -step : step)));
            openSchedule(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    private void openDayPicker(Player p) {
        Menu m = new Menu(2, c("<gold>Forteresse · Quel jour ?"));
        for (int i = 0; i < DAYS.length; i++) {
            String day = DAYS[i];
            String label = day.equals("TOUS") ? "Tous les jours" : day.charAt(0) + day.substring(1).toLowerCase(Locale.ROOT);
            m.set(i, Menu.item(day.equals("TOUS") ? Material.SUNFLOWER : Material.PAPER, c("<gold><v>", "v", label), List.of()), (pl, ct) ->
                    plugin.prompts().ask(pl, "Heure d'ouverture des inscriptions pour « " + label + " » (ex. 21:00) :", txt -> {
                        String line = day + " " + txt.trim().split("\\s+")[0];
                        if (TotemSchedule.parse(line) == null) {
                            say(pl, "<red>Heure illisible : utilise le format 21:00 ou 21h30.");
                            return;
                        }
                        List<String> l = new ArrayList<>(plugin.getConfig().getStringList("fortress.schedule"));
                        l.add(line);
                        set("fortress.schedule", l);
                        say(pl, "<green>Horaire ajouté : <white><v>", "v", pretty(line));
                        openSchedule(pl);
                    }));
        }
        back(m, 13, this::openSchedule).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Gains ──

    public void openRewards(Player p) {
        Menu m = new Menu(4, c("<yellow>Forteresse · Gains"));
        m.set(10, Menu.item(Material.GOLD_INGOT, c("<yellow><b>Banque : <v>", "v", plugin.bank().format(s().fortressRewardMoney)), List.of(
                c("<gray>Versé à la banque de la faction gagnante"),
                c("<yellow>Gauche +10000 · Droit -10000"), c("<yellow>Maj + clic : montant exact"))), (pl, ct) -> {
            if (ct.isShiftClick()) {
                plugin.prompts().ask(pl, "Montant versé à la faction gagnante :", txt -> {
                    try {
                        double v = Double.parseDouble(txt.replace(',', '.').replace(" ", "").replace("$", ""));
                        if (v < 0 || Double.isNaN(v) || Double.isInfinite(v)) throw new NumberFormatException();
                        set("fortress.reward.money", v);
                    } catch (NumberFormatException e) {
                        say(pl, "<red>Montant invalide.");
                    }
                    openRewards(pl);
                });
                return;
            }
            set("fortress.reward.money", Math.max(0, s().fortressRewardMoney + (ct.isRightClick() ? -10000 : 10000)));
            openRewards(pl);
        });
        m.set(12, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter une commande"), List.of(
                c("<gray>Exécutée par la console pour chaque"), c("<gray>participant de la faction gagnante"),
                c("<gray>{player}, {faction}"), c("<gray>ex. <white>crate key give {player} forteresse 1"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Commande à exécuter (sans le /) :", txt -> {
                    String cmd = txt.startsWith("/") ? txt.substring(1) : txt;
                    if (cmd.isBlank()) return;
                    List<String> l = new ArrayList<>(s().fortressRewardCommands);
                    l.add(cmd);
                    set("fortress.reward.commands", l);
                    openRewards(pl);
                }));
        int slot = 18;
        for (String cmd : new ArrayList<>(s().fortressRewardCommands)) {
            if (slot > 25) break;
            m.set(slot++, Menu.item(Material.COMMAND_BLOCK, c("<white>/<v>", "v", cmd), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(s().fortressRewardCommands);
                l.remove(cmd);
                set("fortress.reward.commands", l);
                openRewards(pl);
            });
        }
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Réglages ──

    private void stepper(Menu m, int slot, Material mat, String label, String unit, String path, int value, int min, int step, int bigStep, String hint) {
        List<Component> lore = new ArrayList<>();
        if (hint != null) lore.add(c("<gray>" + hint));
        lore.add(c("<yellow>Gauche +<s1> · Droit -<s1> · Maj ±<s2>", "s1", step, "s2", bigStep));
        m.set(slot, Menu.item(mat, c("<aqua><b>" + label + " : <v>" + unit, "v", value), lore), (pl, ct) -> {
            int st = ct.isShiftClick() ? bigStep : step;
            set(path, Math.max(min, value + (ct.isRightClick() ? -st : st)));
            openSettings(pl);
        });
    }

    private void toggle(Menu m, int slot, String label, String path, boolean value, String hint) {
        m.set(slot, Menu.item(value ? Material.LIME_DYE : Material.GRAY_DYE, c((value ? "<green><b>" : "<red><b>") + label + " : " + (value ? "oui" : "non")),
                List.of(c("<gray>" + hint), c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set(path, !value);
            openSettings(pl);
        });
    }

    public void openSettings(Player p) {
        Menu m = new Menu(5, c("<white>Forteresse · Réglages"));
        toggle(m, 4, "Forteresse activée", "fortress.enabled", s().fortressEnabled, "Inscriptions et lancements automatiques");
        stepper(m, 10, Material.WRITABLE_BOOK, "Inscriptions", " min", "fortress.registration-minutes", s().fortressRegistrationMinutes, 1, 1, 5, null);
        stepper(m, 11, Material.WHITE_BED, "Préparation", " s", "fortress.preparation-seconds", s().fortressPreparationSeconds, 5, 5, 30, "Dans les camps, portes fermées");
        stepper(m, 12, Material.IRON_DOOR, "Assaut", " min", "fortress.assault-minutes", s().fortressAssaultMinutes, 1, 1, 5, "Portes ouvertes");
        stepper(m, 13, Material.LADDER, "Délai pour le sommet", " s", "fortress.summit-grace-seconds", s().fortressSummitGraceSeconds, 10, 10, 60, "Après la fermeture des portes");
        stepper(m, 14, Material.NETHERITE_SWORD, "Bataille", " min", "fortress.battle-minutes", s().fortressBattleMinutes, 1, 1, 5, "Portes fermées, jusqu'au dernier");
        stepper(m, 19, Material.WHITE_BANNER, "Factions minimum", "", "fortress.min-factions", s().fortressMinFactions, 2, 1, 2, null);
        stepper(m, 20, Material.PLAYER_HEAD, "Joueurs minimum par faction", "", "fortress.min-players-per-faction", s().fortressMinPlayers, 1, 1, 5, null);
        stepper(m, 21, Material.SKELETON_SKULL, "Joueurs maximum par faction", "", "fortress.max-players-per-faction", s().fortressMaxPlayers, 0, 1, 5, "0 = sans limite");
        toggle(m, 23, "Garder l'inventaire", "fortress.keep-inventory", s().fortressKeepInventory, "Non = le butin tombe au sol");
        toggle(m, 24, "Perte de power", "fortress.power-loss", s().fortressPowerLoss, "Mourir dans la Forteresse coûte du power");
        toggle(m, 25, "Élytres interdites", "fortress.block-elytra", s().fortressBlockElytra, "Pas de vol plané pour les combattants");
        back(m, 36, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }
}
