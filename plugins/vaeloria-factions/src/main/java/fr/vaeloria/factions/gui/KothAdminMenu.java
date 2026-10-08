package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Zone;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.service.CaptureService;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Interface d'administration du KOTH et des avant-postes (/f koth admin, /f avantposte admin) :
 * points de capture (création, déplacement, rayon, téléportation, lancement, libération, suppression),
 * horaires, gains et réglages. Chaque modification est écrite dans config.yml et appliquée immédiatement.
 */
public final class KothAdminMenu {
    private static final String[] DAYS = {"LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE", "TOUS"};

    private final VaeloriaFactionsPlugin plugin;

    public KothAdminMenu(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private Settings s() { return plugin.settings(); }
    private CaptureService cs() { return plugin.captures(); }

    private static Component c(String mini, Object... kv) { return Msg.parse(mini, kv); }

    private static void say(Player p, String mini, Object... kv) { p.sendMessage(Msg.parse("<prefix>" + mini, kv)); }

    private void set(String path, Object value) { plugin.setConfigValue(path, value); }

    private static Menu back(Menu m, int slot, java.util.function.Consumer<Player> to) {
        return m.set(slot, Menu.item(Material.ARROW, c("<gray>Retour"), List.of()), (pl, ct) -> to.accept(pl));
    }

    private static String kindLabel(Zone.Kind k) { return k == Zone.Kind.KOTH ? "KOTH" : "Avant-poste"; }

    // ── Accueil ──

    public void open(Player p) {
        Menu m = new Menu(6, c("<yellow>KOTH & avant-postes · Administration"));
        Zone act = cs().activeKoth();
        m.set(4, Menu.item(act == null ? Material.GRAY_DYE : Material.GOLDEN_HELMET,
                c(act == null ? "<gray><b>Aucun KOTH en cours" : "<yellow><b>KOTH en cours : <n>", "n", act == null ? "" : act.name),
                act == null ? List.of(c("<gray>Lance-le depuis « Zones de KOTH »")) : List.of(c("<gray>Fin dans <white><t>", "t", Msg.duration(cs().kothRemaining())))), null);
        m.set(19, Menu.item(Material.GOLDEN_HELMET, c("<yellow><b>Zones de KOTH"), List.of(
                c("<gray><n> zone(s)", "n", cs().zones(Zone.Kind.KOTH).size()),
                c("<gray>Créer, déplacer, rayon, lancer, supprimer"), c("<yellow>Clic : ouvrir"))), (pl, ct) -> openZones(pl, Zone.Kind.KOTH));
        m.set(20, Menu.item(Material.WHITE_BANNER, c("<green><b>Avant-postes"), List.of(
                c("<gray><n> avant-poste(s)", "n", cs().zones(Zone.Kind.OUTPOST).size()),
                c("<gray>Créer, déplacer, rayon, libérer, supprimer"), c("<yellow>Clic : ouvrir"))), (pl, ct) -> openZones(pl, Zone.Kind.OUTPOST));
        m.set(22, Menu.item(Material.CLOCK, c("<gold><b>Horaires du KOTH"), scheduleLore()), (pl, ct) -> openSchedule(pl));
        m.set(24, Menu.item(Material.GOLD_BLOCK, c("<yellow><b>Gains"), List.of(
                c("<gray>KOTH : <white><v></white> en banque", "v", plugin.bank().format(s().kothRewardMoney)),
                c("<gray>Avant-poste : <white><v></white> / <white><m></white> min", "v", plugin.bank().format(s().outpostIncomeMoney), "m", s().outpostIncomeMinutes),
                c("<yellow>Clic : modifier"))), (pl, ct) -> openRewards(pl));
        m.set(25, Menu.item(Material.COMPARATOR, c("<white><b>Réglages"), List.of(
                c("<gray>KOTH : tenir <white><v></white>", "v", Msg.duration(s().kothHoldSeconds * 1000L)),
                c("<gray>Avant-poste : capture en <white><v></white>", "v", Msg.duration(s().outpostCaptureSeconds * 1000L)),
                c("<yellow>Clic : modifier"))), (pl, ct) -> openSettings(pl));
        m.set(41, Menu.item(Material.RED_CONCRETE, c("<red><b>Arrêter le KOTH"), List.of(c("<gray>Sans vainqueur"))), (pl, ct) -> {
            if (cs().activeKoth() == null) say(pl, "<gray>Aucun KOTH en cours.");
            else cs().stopKoth(false);
            open(pl);
        });
        m.set(49, Menu.item(Material.BARRIER, c("<red>Fermer"), List.of()), (pl, ct) -> pl.closeInventory());
        m.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    // ── Points de capture ──

    public void openZones(Player p, Zone.Kind kind) {
        boolean koth = kind == Zone.Kind.KOTH;
        Menu m = new Menu(4, c(koth ? "<yellow>Zones de KOTH" : "<green>Avant-postes"));
        int slot = 0;
        for (Zone z : cs().zones(kind)) {
            if (slot >= 27) break;
            List<Component> lore = new ArrayList<>();
            lore.add(c("<gray><w> <x>, <y>, <z>", "w", z.world, "x", z.x, "y", z.y, "z", z.z));
            lore.add(c("<gray>Rayon : <white><rad></white> blocs", "rad", z.radius));
            if (!koth) lore.add(c("<gray>Tenu par : <gold><h>", "h", cs().holderName(z)));
            if (koth && z == cs().activeKoth()) lore.add(c("<yellow>● En cours"));
            lore.add(Component.empty());
            lore.add(c("<yellow>Clic : régler ce point de capture"));
            m.set(slot++, Menu.item(koth ? Material.GOLDEN_HELMET : Material.WHITE_BANNER, c((koth ? "<yellow>" : "<green>") + "<b><n>", "n", z.name), lore),
                    (pl, ct) -> openZone(pl, z));
        }
        if (slot == 0) m.set(13, Menu.item(Material.PAPER, c("<gray>Aucun point de capture"), List.of(c("<gray>Crée le premier avec le bouton vert"))), null);
        m.set(31, Menu.item(Material.EMERALD, c("<green><b>Créer ici"), List.of(
                c("<gray>Centre : ta position actuelle"), c("<gray>Rayon par défaut : 6 blocs"), c("<yellow>Clic : choisir le nom"))), (pl, ct) ->
                plugin.prompts().ask(pl, (kind == Zone.Kind.KOTH ? "Nom de la nouvelle zone de KOTH" : "Nom du nouvel avant-poste") + " (lettres, chiffres, - et _) :", name -> {
                    if (!name.matches("[A-Za-z0-9_-]{2,24}")) {
                        say(pl, "<red>Nom invalide.");
                        return;
                    }
                    if (cs().create(name, kind, pl.getLocation(), 6)) {
                        say(pl, "<green><k> <white><n></white> créé ici (rayon 6).", "k", kindLabel(kind), "n", name);
                        Zone z = cs().get(name, kind);
                        if (z != null) openZone(pl, z);
                    } else say(pl, "<red>Ce nom existe déjà.");
                }));
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    public void openZone(Player p, Zone z) {
        boolean koth = z.kind == Zone.Kind.KOTH;
        Menu m = new Menu(4, c((koth ? "<yellow>KOTH · " : "<green>Avant-poste · ") + "<n>", "n", z.name));
        m.set(4, Menu.item(koth ? Material.GOLDEN_HELMET : Material.WHITE_BANNER, c("<white><b><n>", "n", z.name), List.of(
                c("<gray>Centre : <white><w> <x>, <y>, <z>", "w", z.world, "x", z.x, "y", z.y, "z", z.z),
                c("<gray>Rayon : <white><rad></white> blocs (±5 en hauteur)", "rad", z.radius),
                koth ? c("<gray>Tenir <white><v></white> sans interruption", "v", Msg.duration(s().kothHoldSeconds * 1000L))
                        : c("<gray>Tenu par <gold><h>", "h", cs().holderName(z)))), null);
        m.set(10, Menu.item(Material.COMPASS, c("<aqua><b>Déplacer ici"), List.of(
                c("<gray>Le centre devient ta position actuelle"), c("<gray>La capture en cours repart de zéro"), c("<yellow>Clic : déplacer"))), (pl, ct) -> {
            cs().move(z, pl.getLocation());
            say(pl, "<green>Point de capture <white><n></white> déplacé en <x>, <y>, <z>.", "n", z.name, "x", z.x, "y", z.y, "z", z.z);
            openZone(pl, z);
        });
        m.set(12, Menu.item(Material.SLIME_BALL, c("<green><b>Rayon : <rad> blocs", "rad", z.radius), List.of(
                c("<yellow>Gauche +1 · Droit -1 · Maj ±5"), c("<gray>(entre 2 et 30)"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            cs().setRadius(z, z.radius + (ct.isRightClick() ? -step : step));
            openZone(pl, z);
        });
        m.set(14, Menu.item(Material.ENDER_PEARL, c("<light_purple><b>Se téléporter"), List.of(c("<yellow>Clic : y aller"))), (pl, ct) -> {
            World w = Bukkit.getWorld(z.world);
            if (w != null) pl.teleportAsync(new Location(w, z.x + 0.5, z.y, z.z + 0.5));
            pl.closeInventory();
        });
        if (koth) {
            m.set(16, Menu.item(Material.LIME_CONCRETE, c("<green><b>Lancer ce KOTH"), List.of(
                    c("<gray>Durée : <white><v> min", "v", s().kothDurationMinutes), c("<yellow>Clic : lancer maintenant"))), (pl, ct) -> {
                var r = cs().startKoth(z.name, 0, false);
                if (r != CaptureService.StartResult.OK) pl.sendMessage(Msg.prefixed("koth.start-fail." + r.name().toLowerCase(Locale.ROOT), "name", z.name));
                open(pl);
            });
        } else {
            m.set(16, Menu.item(Material.WHITE_DYE, c("<white><b>Libérer"), List.of(
                    c("<gray>Retire l'avant-poste à <gold><h>", "h", cs().holderName(z)), c("<yellow>Clic : libérer"))), (pl, ct) -> {
                cs().release(z);
                say(pl, "<gray>Avant-poste <white><n></white> libéré.", "n", z.name);
                openZone(pl, z);
            });
        }
        m.set(22, Menu.item(Material.TNT, c("<red><b>Supprimer"), List.of(c("<red>Maj + clic droit : supprimer"))), (pl, ct) -> {
            if (ct != ClickType.SHIFT_RIGHT) return;
            plugin.prompts().ask(pl, "Tape « supprimer " + z.name + " » pour confirmer.", txt -> {
                if (txt.equalsIgnoreCase("supprimer " + z.name)) {
                    cs().delete(z.name, z.kind);
                    say(pl, "<green><k> <white><n></white> supprimé.", "k", kindLabel(z.kind), "n", z.name);
                } else say(pl, "<gray>Suppression annulée.");
                openZones(pl, z.kind);
            });
        });
        back(m, 27, pl -> openZones(pl, z.kind)).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Horaires ──

    private List<Component> scheduleLore() {
        List<Component> l = new ArrayList<>();
        List<String> raw = plugin.getConfig().getStringList("koth.schedule");
        if (raw.isEmpty()) l.add(c("<gray>Aucun lancement automatique"));
        for (String r : raw) l.add(c("<white>• <v>", "v", pretty(r)));
        l.add(c("<gray>Minimum <white><v></white> joueurs connectés", "v", s().kothMinOnline));
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

    public void openSchedule(Player p) {
        Menu m = new Menu(4, c("<gold>KOTH · Horaires"));
        List<String> raw = new ArrayList<>(plugin.getConfig().getStringList("koth.schedule"));
        for (int i = 0; i < raw.size() && i < 18; i++) {
            String entry = raw.get(i);
            m.set(i, Menu.item(Material.CLOCK, c("<gold><v>", "v", pretty(entry)), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(plugin.getConfig().getStringList("koth.schedule"));
                l.remove(entry);
                set("koth.schedule", l);
                say(pl, "<gray>Horaire supprimé : <white><v>", "v", pretty(entry));
                openSchedule(pl);
            });
        }
        m.set(22, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter un horaire"), List.of(c("<gray>Choisir le jour, puis l'heure"))), (pl, ct) -> openDayPicker(pl));
        m.set(24, Menu.item(Material.PLAYER_HEAD, c("<white><b>Joueurs minimum : <v>", "v", s().kothMinOnline), List.of(
                c("<gray>Pour un lancement automatique"), c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("koth.min-online", Math.max(0, s().kothMinOnline + (ct.isRightClick() ? -step : step)));
            openSchedule(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    private void openDayPicker(Player p) {
        Menu m = new Menu(2, c("<gold>KOTH · Quel jour ?"));
        for (int i = 0; i < DAYS.length; i++) {
            String day = DAYS[i];
            String label = day.equals("TOUS") ? "Tous les jours" : day.charAt(0) + day.substring(1).toLowerCase(Locale.ROOT);
            m.set(i, Menu.item(day.equals("TOUS") ? Material.SUNFLOWER : Material.PAPER, c("<gold><v>", "v", label), List.of()), (pl, ct) ->
                    plugin.prompts().ask(pl, "Heure pour « " + label + " » (ex. 18:00), suivie si tu veux du nom d'une zone de KOTH :", txt -> {
                        String line = day + " " + txt.trim();
                        TotemSchedule.Entry e = TotemSchedule.parse(line);
                        if (e == null) {
                            say(pl, "<red>Heure illisible : utilise le format 18:00 ou 18h30.");
                            return;
                        }
                        if (e.totem() != null && cs().get(e.totem(), Zone.Kind.KOTH) == null) {
                            say(pl, "<red>Zone de KOTH inconnue : <white><v>", "v", e.totem());
                            return;
                        }
                        List<String> l = new ArrayList<>(plugin.getConfig().getStringList("koth.schedule"));
                        l.add(line);
                        set("koth.schedule", l);
                        say(pl, "<green>Horaire ajouté : <white><v>", "v", pretty(line));
                        openSchedule(pl);
                    }));
        }
        back(m, 13, this::openSchedule).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Gains ──

    private void askMoney(Player pl, String question, String path, Runnable reopen) {
        plugin.prompts().ask(pl, question, txt -> {
            try {
                double v = Double.parseDouble(txt.replace(',', '.').replace(" ", "").replace("$", ""));
                if (v < 0 || Double.isInfinite(v) || Double.isNaN(v)) throw new NumberFormatException();
                set(path, v);
                say(pl, "<green>Montant enregistré : <white><v>", "v", plugin.bank().format(v));
            } catch (NumberFormatException e) {
                say(pl, "<red>Montant invalide.");
            }
            reopen.run();
        });
    }

    public void openRewards(Player p) {
        Menu m = new Menu(4, c("<yellow>KOTH & avant-postes · Gains"));
        m.set(10, Menu.item(Material.GOLD_INGOT, c("<yellow><b>KOTH : <v> en banque", "v", plugin.bank().format(s().kothRewardMoney)), List.of(
                c("<gray>Versé à la faction gagnante"), c("<yellow>Gauche +5000 · Droit -5000"), c("<yellow>Maj + clic : montant exact"))), (pl, ct) -> {
            if (ct.isShiftClick()) {
                askMoney(pl, "Montant versé à la faction qui gagne le KOTH :", "koth.reward.money", () -> openRewards(pl));
                return;
            }
            set("koth.reward.money", Math.max(0, s().kothRewardMoney + (ct.isRightClick() ? -5000 : 5000)));
            openRewards(pl);
        });
        m.set(11, Menu.item(Material.BLAZE_POWDER, c("<gold><b>KOTH : +<v> power", "v", Msg.fmt(s().kothRewardPower)), List.of(
                c("<gray>Bonus de power permanent pour la faction gagnante"), c("<yellow>Gauche +1 · Droit -1"))), (pl, ct) -> {
            set("koth.reward.power-boost", Math.max(0, s().kothRewardPower + (ct.isRightClick() ? -1 : 1)));
            openRewards(pl);
        });
        m.set(13, Menu.item(Material.LIME_DYE, c("<green><b>KOTH : ajouter une commande"), List.of(
                c("<gray>Exécutée par la console à la victoire"), c("<gray>{player} = un joueur de la zone, {faction}, {koth}"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Commande à exécuter (sans le /) :", txt -> {
                    String cmd = txt.startsWith("/") ? txt.substring(1) : txt;
                    if (cmd.isBlank()) return;
                    List<String> l = new ArrayList<>(s().kothRewardCommands);
                    l.add(cmd);
                    set("koth.reward.commands", l);
                    say(pl, "<green>Commande ajoutée : <white>/<v>", "v", cmd);
                    openRewards(pl);
                }));
        m.set(15, Menu.item(Material.EMERALD, c("<green><b>Avant-poste : <v>", "v", plugin.bank().format(s().outpostIncomeMoney)), List.of(
                c("<gray>Versé toutes les <white><m></white> min à la faction qui le tient", "m", s().outpostIncomeMinutes),
                c("<yellow>Gauche +500 · Droit -500"), c("<yellow>Maj + clic : montant exact"))), (pl, ct) -> {
            if (ct.isShiftClick()) {
                askMoney(pl, "Revenu versé par un avant-poste à chaque échéance :", "outposts.income-money", () -> openRewards(pl));
                return;
            }
            set("outposts.income-money", Math.max(0, s().outpostIncomeMoney + (ct.isRightClick() ? -500 : 500)));
            openRewards(pl);
        });
        m.set(16, Menu.item(Material.CLOCK, c("<green><b>Avant-poste : toutes les <v> min", "v", s().outpostIncomeMinutes), List.of(
                c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("outposts.income-minutes", Math.max(1, s().outpostIncomeMinutes + (ct.isRightClick() ? -step : step)));
            openRewards(pl);
        });
        m.set(25, Menu.item(Material.BLAZE_ROD, c("<gold><b>Avant-poste : +<v> power", "v", Msg.fmt(s().outpostPower)), List.of(
                c("<gray>Power de faction par avant-poste tenu"), c("<yellow>Gauche +1 · Droit -1"))), (pl, ct) -> {
            set("outposts.power-bonus", Math.max(0, s().outpostPower + (ct.isRightClick() ? -1 : 1)));
            openRewards(pl);
        });
        int slot = 18;
        for (String cmd : new ArrayList<>(s().kothRewardCommands)) {
            if (slot > 22) break;
            m.set(slot++, Menu.item(Material.COMMAND_BLOCK, c("<white>/<v>", "v", cmd), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(s().kothRewardCommands);
                l.remove(cmd);
                set("koth.reward.commands", l);
                openRewards(pl);
            });
        }
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Réglages ──

    public void openSettings(Player p) {
        Menu m = new Menu(4, c("<white>KOTH & avant-postes · Réglages"));
        m.set(10, Menu.item(s().kothEnabled ? Material.LIME_DYE : Material.GRAY_DYE,
                c(s().kothEnabled ? "<green><b>KOTH activé" : "<red><b>KOTH désactivé"), List.of(c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set("koth.enabled", !s().kothEnabled);
            openSettings(pl);
        });
        m.set(11, Menu.item(Material.GOLDEN_HELMET, c("<yellow><b>KOTH : tenir <v>", "v", Msg.duration(s().kothHoldSeconds * 1000L)), List.of(
                c("<gray>Temps sans interruption pour gagner"), c("<yellow>Gauche +30 s · Droit -30 s · Maj ±5 s"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 30;
            set("koth.hold-seconds", Math.max(10, s().kothHoldSeconds + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        m.set(12, Menu.item(Material.CLOCK, c("<gold><b>KOTH : durée <v> min", "v", s().kothDurationMinutes), List.of(
                c("<gray>Sans vainqueur à la fin, le KOTH s'arrête"), c("<yellow>Gauche +5 · Droit -5 · Maj ±1"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 1 : 5;
            set("koth.duration-minutes", Math.max(1, s().kothDurationMinutes + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        m.set(14, Menu.item(s().outpostsEnabled ? Material.LIME_DYE : Material.GRAY_DYE,
                c(s().outpostsEnabled ? "<green><b>Avant-postes activés" : "<red><b>Avant-postes désactivés"), List.of(c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set("outposts.enabled", !s().outpostsEnabled);
            openSettings(pl);
        });
        m.set(15, Menu.item(Material.WHITE_BANNER, c("<green><b>Avant-poste : capture en <v>", "v", Msg.duration(s().outpostCaptureSeconds * 1000L)), List.of(
                c("<gray>Temps seul dans la zone pour la prendre"), c("<yellow>Gauche +10 s · Droit -10 s · Maj ±60 s"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 60 : 10;
            set("outposts.capture-seconds", Math.max(5, s().outpostCaptureSeconds + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }
}
