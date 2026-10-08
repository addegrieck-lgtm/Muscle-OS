package fr.vaeloria.factions.gui;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Pos;
import fr.vaeloria.factions.model.Zone;
import fr.vaeloria.factions.service.ConvoyService;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.inventory.ClickType;

import java.util.ArrayList;
import java.util.List;

/**
 * Interface d'administration du convoi (/f convoi admin) : lancement, points d'atterrissage, chunks de la warzone,
 * avant-postes et faction qui les tient, gains et réglages. Écrit dans config.yml / data et appliqué immédiatement.
 */
public final class ConvoyAdminMenu {
    private final VaeloriaFactionsPlugin plugin;

    public ConvoyAdminMenu(VaeloriaFactionsPlugin plugin) {
        this.plugin = plugin;
    }

    private Settings s() { return plugin.settings(); }
    private ConvoyService cv() { return plugin.convoy(); }

    private static Component c(String mini, Object... kv) { return Msg.parse(mini, kv); }

    private static void say(Player p, String mini, Object... kv) { p.sendMessage(Msg.parse("<prefix>" + mini, kv)); }

    private void set(String path, Object value) { plugin.setConfigValue(path, value); }

    private static Menu back(Menu m, int slot, java.util.function.Consumer<Player> to) {
        return m.set(slot, Menu.item(Material.ARROW, c("<gray>Retour"), List.of()), (pl, ct) -> to.accept(pl));
    }

    // ── Accueil ──

    public void open(Player p) {
        Menu m = new Menu(6, c("<aqua>Convoi · Administration"));
        String state = switch (cv().phase()) {
            case IDLE -> "<gray>Prochain convoi dans <white>" + Msg.duration(cv().nextIn());
            case FALLING -> "<aqua>La caisse tombe…";
            case LANDED -> "<aqua>Caisse posée, en attente d'ouverture";
            case CARRIED -> "<gold>Clé en circulation";
        };
        m.set(4, Menu.item(Material.CHEST, c("<aqua><b>Convoi"), List.of(c(state),
                c("<gray>Toutes les <white><v></white> min", "v", s().convoyIntervalMinutes))), null);
        m.set(19, Menu.item(Material.LIME_CONCRETE, c("<green><b>Lancer un convoi maintenant"), List.of(
                c("<gray>Fait tomber une caisse tout de suite"))), (pl, ct) -> {
            var r = cv().start(false);
            if (r != ConvoyService.StartResult.OK) pl.sendMessage(Msg.prefixed("convoy.start-fail." + r.name().toLowerCase(java.util.Locale.ROOT)));
            open(pl);
        });
        m.set(20, Menu.item(Material.RED_CONCRETE, c("<red><b>Arrêter le convoi en cours"), List.of(c("<gray>Sans vainqueur, la clé disparaît"))), (pl, ct) -> {
            cv().end(null, "stopped");
            open(pl);
        });
        m.set(22, Menu.item(Material.TARGET, c("<aqua><b>Points d'atterrissage"), List.of(
                c("<gray><n> point(s) défini(s)", "n", cv().drops().size()),
                c("<gray>Sans point : un chunk de warzone au hasard"), c("<yellow>Clic : gérer"))), (pl, ct) -> openDrops(pl));
        m.set(23, Menu.item(Material.RED_BANNER, c("<red><b>Warzone"), List.of(
                c("<gray><n> chunk(s) en warzone", "n", plugin.manager().warzone().claims.size()),
                c("<gray>Choisir quels chunks sont la warzone"), c("<yellow>Clic : gérer"))), (pl, ct) -> openWarzone(pl));
        m.set(24, Menu.item(Material.WHITE_BANNER, c("<green><b>Avant-postes"), List.of(
                c("<gray><n> avant-poste(s)", "n", plugin.captures().zones(Zone.Kind.OUTPOST).size()),
                c("<gray>Créer, déplacer, attribuer à une faction"), c("<yellow>Clic : gérer"))), (pl, ct) -> plugin.kothAdmin().openZones(pl, Zone.Kind.OUTPOST));
        m.set(30, Menu.item(Material.GOLD_BLOCK, c("<yellow><b>Gains"), List.of(
                c("<gray>Banque : <white><v>", "v", plugin.bank().format(s().convoyRewardMoney)),
                c("<gray>Commandes : <white><v>", "v", s().convoyRewardCommands.size()), c("<yellow>Clic : modifier"))), (pl, ct) -> openRewards(pl));
        m.set(32, Menu.item(Material.COMPARATOR, c("<white><b>Réglages"), List.of(
                c("<gray>Fréquence, ouverture, durée, joueurs minimum"), c("<yellow>Clic : modifier"))), (pl, ct) -> openSettings(pl));
        m.set(49, Menu.item(Material.BARRIER, c("<red>Fermer"), List.of()), (pl, ct) -> pl.closeInventory());
        m.fill(Material.BLACK_STAINED_GLASS_PANE).open(p);
    }

    // ── Points d'atterrissage ──

    public void openDrops(Player p) {
        Menu m = new Menu(4, c("<aqua>Convoi · Points d'atterrissage"));
        List<Pos> drops = cv().drops();
        for (int i = 0; i < drops.size() && i < 27; i++) {
            Pos d = drops.get(i);
            final int idx = i;
            m.set(i, Menu.item(Material.TARGET, c("<aqua><b>Point <n>", "n", i + 1), List.of(
                    c("<gray><w> <x>, <y>, <z>", "w", d.world, "x", (int) d.x, "y", (int) d.y, "z", (int) d.z),
                    c("<aqua>Clic : s'y téléporter"), c("<red>Maj + clic droit : supprimer"))), (pl, ct) -> {
                if (ct == ClickType.SHIFT_RIGHT) {
                    if (idx < cv().drops().size()) cv().drops().remove(idx);
                    plugin.manager().markDirty();
                    openDrops(pl);
                    return;
                }
                Location l = d.toLocation();
                if (l != null) pl.teleportAsync(l);
                pl.closeInventory();
            });
        }
        m.set(31, Menu.item(Material.EMERALD, c("<green><b>Ajouter ici"), List.of(
                c("<gray>La caisse pourra tomber à ta position"), c("<gray>(de préférence en warzone)"))), (pl, ct) -> {
            Faction here = plugin.manager().factionAt(pl.getLocation());
            cv().drops().add(Pos.of(pl.getLocation()));
            plugin.manager().markDirty();
            if (here == null || !here.isWarzone()) say(pl, "<gold>Attention : ce point n'est pas en warzone.");
            say(pl, "<green>Point d'atterrissage ajouté.");
            openDrops(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Warzone ──

    private int claimSquare(Player pl, int radius, boolean add) {
        ChunkPos c = ChunkPos.of(pl.getLocation());
        Faction wz = plugin.manager().warzone();
        int n = 0;
        for (int dx = -radius + 1; dx < radius; dx++) for (int dz = -radius + 1; dz < radius; dz++) {
            ChunkPos t = c.offset(dx, dz);
            Faction prev = plugin.manager().factionAt(t);
            if (add) {
                if (prev == wz) continue;
                if (prev != null) plugin.bridge().claim(prev, t, false);
                plugin.manager().claim(wz, t);
                n++;
            } else if (prev == wz) {
                plugin.manager().unclaim(t);
                n++;
            }
        }
        return n;
    }

    public void openWarzone(Player p) {
        Menu m = new Menu(4, c("<red>Convoi · Warzone"));
        ChunkPos here = ChunkPos.of(p.getLocation());
        Faction owner = plugin.manager().factionAt(here);
        m.set(4, Menu.item(Material.RED_BANNER, c("<red><b>Warzone : <n> chunk(s)", "n", plugin.manager().warzone().claims.size()), List.of(
                c("<gray>Chunk actuel <white><x>, <z></white> : <v>", "x", here.x(), "z", here.z(),
                        "v", owner == null ? "nature" : owner.name),
                c("<gray>Au-delà de la warzone : les avant-postes"))), null);
        m.set(10, Menu.item(Material.RED_WOOL, c("<red><b>Ajouter ce chunk"), List.of(c("<gray>Le chunk où tu te tiens devient warzone"))), (pl, ct) -> {
            say(pl, "<green><n> chunk ajouté à la warzone.", "n", claimSquare(pl, 1, true));
            openWarzone(pl);
        });
        m.set(11, Menu.item(Material.RED_CONCRETE, c("<red><b>Ajouter un carré ici"), List.of(c("<gray>Rayon en chunks, tapé dans le chat"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Rayon du carré de warzone, en chunks (1 à 20) :", txt -> {
                    int r;
                    try { r = Math.max(1, Math.min(20, Integer.parseInt(txt.trim()))); } catch (NumberFormatException e) { say(pl, "<red>Nombre invalide."); return; }
                    say(pl, "<green><n> chunk(s) ajouté(s) à la warzone.", "n", claimSquare(pl, r, true));
                    openWarzone(pl);
                }));
        m.set(13, Menu.item(Material.WHITE_WOOL, c("<white><b>Retirer ce chunk"), List.of(c("<gray>Le chunk redevient nature"))), (pl, ct) -> {
            say(pl, "<gray><n> chunk retiré de la warzone.", "n", claimSquare(pl, 1, false));
            openWarzone(pl);
        });
        m.set(14, Menu.item(Material.WHITE_CONCRETE, c("<white><b>Retirer un carré ici"), List.of(c("<gray>Rayon en chunks, tapé dans le chat"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Rayon du carré à retirer, en chunks (1 à 20) :", txt -> {
                    int r;
                    try { r = Math.max(1, Math.min(20, Integer.parseInt(txt.trim()))); } catch (NumberFormatException e) { say(pl, "<red>Nombre invalide."); return; }
                    say(pl, "<gray><n> chunk(s) retiré(s) de la warzone.", "n", claimSquare(pl, r, false));
                    openWarzone(pl);
                }));
        m.set(16, Menu.item(Material.GLASS, c("<white><b>Voir les bordures"), List.of(c("<gray>Particules aux limites du chunk"), c("<yellow>Clic : basculer"))), (pl, ct) -> {
            pl.closeInventory();
            plugin.territory().toggleSeeChunk(pl);
        });
        m.set(22, Menu.item(Material.TNT, c("<red><b>Vider toute la warzone"), List.of(c("<red>Maj + clic droit, puis confirmation"))), (pl, ct) -> {
            if (ct != ClickType.SHIFT_RIGHT) return;
            plugin.prompts().ask(pl, "Tape « vider la warzone » pour confirmer.", txt -> {
                if (!txt.equalsIgnoreCase("vider la warzone")) { say(pl, "<gray>Annulé."); return; }
                int n = 0;
                for (ChunkPos c2 : new ArrayList<>(plugin.manager().warzone().claims)) { plugin.manager().unclaim(c2); n++; }
                say(pl, "<gray>Warzone vidée (<n> chunks).", "n", n);
                openWarzone(pl);
            });
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Gains ──

    public void openRewards(Player p) {
        Menu m = new Menu(4, c("<yellow>Convoi · Gains"));
        m.set(10, Menu.item(Material.GOLD_INGOT, c("<yellow><b>Banque : <v>", "v", plugin.bank().format(s().convoyRewardMoney)), List.of(
                c("<gray>Versé à la faction du porteur (ou au joueur sans faction)"),
                c("<yellow>Gauche +5000 · Droit -5000"), c("<yellow>Maj + clic : montant exact"))), (pl, ct) -> {
            if (ct.isShiftClick()) {
                plugin.prompts().ask(pl, "Montant gagné en rapportant la clé :", txt -> {
                    try {
                        double v = Double.parseDouble(txt.replace(',', '.').replace(" ", "").replace("$", ""));
                        if (v < 0 || Double.isNaN(v) || Double.isInfinite(v)) throw new NumberFormatException();
                        set("convoy.reward.money", v);
                    } catch (NumberFormatException e) {
                        say(pl, "<red>Montant invalide.");
                    }
                    openRewards(pl);
                });
                return;
            }
            set("convoy.reward.money", Math.max(0, s().convoyRewardMoney + (ct.isRightClick() ? -5000 : 5000)));
            openRewards(pl);
        });
        m.set(12, Menu.item(Material.LIME_DYE, c("<green><b>Ajouter une commande"), List.of(
                c("<gray>Exécutée par la console à la victoire"), c("<gray>{player}, {faction}"),
                c("<gray>ex. <white>crate key give {player} convoi 1"))), (pl, ct) ->
                plugin.prompts().ask(pl, "Commande à exécuter (sans le /) :", txt -> {
                    String cmd = txt.startsWith("/") ? txt.substring(1) : txt;
                    if (cmd.isBlank()) return;
                    List<String> l = new ArrayList<>(s().convoyRewardCommands);
                    l.add(cmd);
                    set("convoy.reward.commands", l);
                    openRewards(pl);
                }));
        int slot = 18;
        for (String cmd : new ArrayList<>(s().convoyRewardCommands)) {
            if (slot > 25) break;
            m.set(slot++, Menu.item(Material.COMMAND_BLOCK, c("<white>/<v>", "v", cmd), List.of(c("<red>Maj + clic : supprimer"))), (pl, ct) -> {
                if (!ct.isShiftClick()) return;
                List<String> l = new ArrayList<>(s().convoyRewardCommands);
                l.remove(cmd);
                set("convoy.reward.commands", l);
                openRewards(pl);
            });
        }
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }

    // ── Réglages ──

    public void openSettings(Player p) {
        Menu m = new Menu(4, c("<white>Convoi · Réglages"));
        m.set(10, Menu.item(s().convoyEnabled ? Material.LIME_DYE : Material.GRAY_DYE,
                c(s().convoyEnabled ? "<green><b>Convoi activé" : "<red><b>Convoi désactivé"), List.of(c("<yellow>Clic : basculer"))), (pl, ct) -> {
            set("convoy.enabled", !s().convoyEnabled);
            openSettings(pl);
        });
        m.set(11, Menu.item(Material.CLOCK, c("<aqua><b>Toutes les <v> min", "v", s().convoyIntervalMinutes), List.of(
                c("<yellow>Gauche +5 · Droit -5 · Maj ±1"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 1 : 5;
            set("convoy.interval-minutes", Math.max(1, s().convoyIntervalMinutes + (ct.isRightClick() ? -step : step)));
            cv().rescheduleFromNow();
            openSettings(pl);
        });
        m.set(12, Menu.item(Material.CHEST, c("<aqua><b>Ouverture : <v> s", "v", s().convoyOpenSeconds), List.of(
                c("<gray>Temps à rester près de la caisse"), c("<yellow>Gauche +1 · Droit -1"))), (pl, ct) -> {
            set("convoy.open-seconds", Math.max(0, s().convoyOpenSeconds + (ct.isRightClick() ? -1 : 1)));
            openSettings(pl);
        });
        m.set(13, Menu.item(Material.HOPPER, c("<aqua><b>Durée : <v> min", "v", s().convoyDurationMinutes), List.of(
                c("<gray>Pour ouvrir la caisse et rapporter la clé"), c("<yellow>Gauche +5 · Droit -5 · Maj ±1"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 1 : 5;
            set("convoy.duration-minutes", Math.max(1, s().convoyDurationMinutes + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        m.set(14, Menu.item(Material.PLAYER_HEAD, c("<white><b>Joueurs minimum : <v>", "v", s().convoyMinOnline), List.of(
                c("<yellow>Gauche +1 · Droit -1 · Maj ±5"))), (pl, ct) -> {
            int step = ct.isShiftClick() ? 5 : 1;
            set("convoy.min-online", Math.max(0, s().convoyMinOnline + (ct.isRightClick() ? -step : step)));
            openSettings(pl);
        });
        m.set(15, Menu.item(Material.SPYGLASS, c("<white><b>Position du porteur : toutes les <v> s", "v", s().convoyRevealSeconds), List.of(
                c("<yellow>Gauche +10 · Droit -10"))), (pl, ct) -> {
            set("convoy.reveal-seconds", Math.max(5, s().convoyRevealSeconds + (ct.isRightClick() ? -10 : 10)));
            openSettings(pl);
        });
        back(m, 27, this::open).fill(Material.GRAY_STAINED_GLASS_PANE).open(p);
    }
}
