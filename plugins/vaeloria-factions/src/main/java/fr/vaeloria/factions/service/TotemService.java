package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.TotemDef;
import fr.vaeloria.factions.rules.TotemProgress;
import fr.vaeloria.factions.rules.TotemSchedule;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.Display;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.entity.TextDisplay;
import org.bukkit.persistence.PersistentDataType;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

/**
 * L'événement Totem : une colonne d'obsidienne à abattre. La faction qui casse tous les blocs d'affilée gagne ;
 * si une autre faction casse un bloc, le totem se reconstruit et elle prend la main.
 * Hologramme au-dessus du totem, barre de boss pour tout le serveur, programmation automatique, récompenses,
 * annonce Discord et publication sur le site (KOTH_START / KOTH_CAPTURE).
 */
public final class TotemService {
    private final VaeloriaFactionsPlugin plugin;
    private final Settings settings;
    private final Store.State state;
    private final NamespacedKey hologramKey;

    private Active active;
    private String lastScheduleKey;
    /** Casses en cours : joueur → bloc visé et ticks écoulés. */
    private final java.util.Map<java.util.UUID, Dig> digs = new java.util.HashMap<>();
    /** Identifiant d'« entité » des fissures affichées, un par hauteur de bloc. */
    private static final int CRACK_ID = 0x7A7E0000;

    private static final class Dig {
        final Block block;
        int ticks;

        Dig(Block block) { this.block = block; }
    }

    private static final class Active {
        final TotemDef def;
        final TotemProgress progress;
        final long endsAt;
        final BossBar bar = BossBar.bossBar(Component.empty(), 1f, BossBar.Color.PURPLE, BossBar.Overlay.NOTCHED_10);
        TextDisplay hologram;

        Active(TotemDef def, int height, long endsAt) {
            this.def = def;
            this.progress = new TotemProgress(height);
            this.endsAt = endsAt;
        }
    }

    public TotemService(VaeloriaFactionsPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
        this.hologramKey = new NamespacedKey(plugin, "totem_hologram");
    }

    // ── Définitions (staff) ──

    public List<TotemDef> definitions() { return new ArrayList<>(state.totems.values()); }

    public TotemDef get(String name) { return name == null ? null : state.totems.get(name.toLowerCase(Locale.ROOT)); }

    public boolean create(String name, Block base) {
        String key = name.toLowerCase(Locale.ROOT);
        if (state.totems.containsKey(key)) return false;
        TotemDef d = new TotemDef(name, base);
        state.totems.put(key, d);
        plugin.manager().markDirty();
        build(d);
        return true;
    }

    public boolean delete(String name) {
        TotemDef d = get(name);
        if (d == null) return false;
        if (active != null && active.def == d) stop(false);
        clear(d);
        state.totems.remove(name.toLowerCase(Locale.ROOT));
        plugin.manager().markDirty();
        return true;
    }

    private List<Block> blocks(TotemDef d) {
        List<Block> l = new ArrayList<>();
        World w = d.bukkitWorld();
        if (w == null) return l;
        for (int i = 0; i < settings.totemHeight; i++) l.add(w.getBlockAt(d.x, d.y + i, d.z));
        return l;
    }

    /** Reconstruit la colonne, sauf éventuellement le bloc en train d'être cassé. */
    private void build(TotemDef d, Block except) {
        for (Block b : blocks(d)) if (!b.equals(except)) b.setType(settings.totemMaterial, false);
    }

    private void build(TotemDef d) { build(d, null); }

    private void clear(TotemDef d) {
        for (Block b : blocks(d)) if (b.getType() == settings.totemMaterial) b.setType(Material.AIR, false);
    }

    /** Retire les colonnes de tous les totems inactifs (avant un changement de hauteur). */
    public void clearAll() {
        for (TotemDef d : state.totems.values()) clear(d);
    }

    /** Reconstruit les colonnes de tous les totems. */
    public void rebuildAll() {
        for (TotemDef d : state.totems.values()) build(d);
    }

    // ── État ──

    public boolean isActive() { return active != null; }

    public TotemDef activeDef() { return active == null ? null : active.def; }

    /** Le bloc appartient-il à un totem (actif ou non) ? Ces blocs échappent aux protections de territoire. */
    public boolean isTotemBlock(Block b) {
        if (state.totems.isEmpty()) return false;
        for (TotemDef d : state.totems.values()) if (d.contains(b, settings.totemHeight)) return true;
        return false;
    }

    public boolean isActiveBlock(Block b) {
        return active != null && active.def.contains(b, settings.totemHeight);
    }

    // ── Déroulement ──

    public enum StartResult { OK, DISABLED, ALREADY_RUNNING, UNKNOWN, NONE_DEFINED, WORLD_MISSING, NOT_ENOUGH_PLAYERS }

    public StartResult start(String name, int minutes, boolean scheduled) {
        if (!settings.totemEnabled) return StartResult.DISABLED;
        if (active != null) return StartResult.ALREADY_RUNNING;
        TotemDef d;
        if (name == null) {
            List<TotemDef> all = definitions();
            if (all.isEmpty()) return StartResult.NONE_DEFINED;
            d = all.get(ThreadLocalRandom.current().nextInt(all.size()));
        } else {
            d = get(name);
            if (d == null) return StartResult.UNKNOWN;
        }
        if (d.bukkitWorld() == null) return StartResult.WORLD_MISSING;
        if (scheduled && Bukkit.getOnlinePlayers().size() < settings.totemMinOnline) return StartResult.NOT_ENOUGH_PLAYERS;
        int duration = minutes > 0 ? minutes : settings.totemDurationMinutes;
        active = new Active(d, settings.totemHeight, System.currentTimeMillis() + duration * 60_000L);
        build(d);
        spawnHologram();
        for (Player p : Bukkit.getOnlinePlayers()) p.showBossBar(active.bar);
        refresh();
        Bukkit.broadcast(Msg.prefixed("totem.started", "totem", d.name, "x", d.x, "y", d.y, "z", d.z,
                "height", settings.totemHeight, "minutes", duration, "item", itemName()));
        Title t = Title.title(Msg.get("totem.start-title"), Msg.get("totem.start-subtitle", "totem", d.name, "x", d.x, "z", d.z),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.showTitle(t);
            p.playSound(p.getLocation(), Sound.ENTITY_ENDER_DRAGON_GROWL, 0.6f, 1.2f);
        }
        plugin.bridge().kothStart("Totem " + d.name, duration * 60);
        plugin.discord().totem("🗿 Totem " + d.name, "Le totem **" + d.name + "** est apparu en **" + d.x + ", " + d.z
                + "** ! " + settings.totemHeight + " blocs d'obsidienne à abattre, " + duration + " min.");
        return StartResult.OK;
    }

    /** Arrêt sans vainqueur (temps écoulé ou staff). */
    public void stop(boolean timeout) {
        if (active == null) return;
        Active a = active;
        active = null;
        cleanup(a);
        clear(a.def);
        Bukkit.broadcast(Msg.prefixed(timeout ? "totem.timeout" : "totem.stopped", "totem", a.def.name));
        if (timeout) plugin.discord().totem("Totem " + a.def.name, "Personne n'a abattu le totem à temps.");
    }

    private void cleanup(Active a) {
        for (Dig d : digs.values()) clearCrack(d.block);
        digs.clear();
        for (Player p : Bukkit.getOnlinePlayers()) p.hideBossBar(a.bar);
        if (a.hologram != null && a.hologram.isValid()) a.hologram.remove();
    }

    // ── Casse chronométrée ──

    public enum DigStart { STARTED, NOT_ACTIVE, NO_FACTION, WRONG_ITEM }

    public boolean holdsRequiredItem(Player p) {
        return settings.totemRequiredItem == null || p.getInventory().getItemInMainHand().getType() == settings.totemRequiredItem;
    }

    /** Le joueur commence à frapper un bloc du totem (clic gauche maintenu). */
    public DigStart startDig(Player p, Block b) {
        if (active == null || !active.def.contains(b, settings.totemHeight)) return DigStart.NOT_ACTIVE;
        if (plugin.manager().factionOf(p) == null) return DigStart.NO_FACTION;
        if (!holdsRequiredItem(p)) return DigStart.WRONG_ITEM;
        Dig previous = digs.put(p.getUniqueId(), new Dig(b));
        if (previous != null && !previous.block.equals(b)) clearCrack(previous.block);
        return DigStart.STARTED;
    }

    public void abortDig(Player p) {
        Dig d = digs.remove(p.getUniqueId());
        if (d != null && digs.values().stream().noneMatch(o -> o.block.equals(d.block))) clearCrack(d.block);
    }

    private void sendCrack(Block b, float progress) {
        Location l = b.getLocation();
        int id = CRACK_ID + (b.getY() & 0xFFFF);
        for (Player o : b.getWorld().getPlayers()) {
            if (o.getLocation().distanceSquared(l) < 48 * 48) o.sendBlockDamage(l, progress, id);
        }
    }

    private void clearCrack(Block b) { sendCrack(b, 0f); }

    /** Chaque tick : fait avancer les casses valides, annule les autres. */
    public void tickDigs() {
        if (digs.isEmpty()) return;
        int total = fr.vaeloria.factions.rules.DigTimer.ticksFor(settings.totemBreakSeconds);
        // Parcours d'une copie : terminer une casse annule celles des autres joueurs sur le même bloc.
        for (var e : new ArrayList<>(digs.entrySet())) {
            if (digs.get(e.getKey()) != e.getValue()) continue;
            Player p = Bukkit.getPlayer(e.getKey());
            Dig d = e.getValue();
            boolean valid = p != null && p.isOnline() && !p.isDead() && active != null
                    && active.def.contains(d.block, settings.totemHeight) && d.block.getType() == settings.totemMaterial
                    && holdsRequiredItem(p) && lookingAtTotem(p, d.block);
            if (!valid) {
                digs.remove(e.getKey());
                if (digs.values().stream().noneMatch(o -> o.block.equals(d.block))) clearCrack(d.block);
                if (p != null && active != null && !holdsRequiredItem(p)) p.sendActionBar(Msg.get("totem.wrong-item", "item", itemName()));
                continue;
            }
            d.ticks++;
            float progress = fr.vaeloria.factions.rules.DigTimer.progress(d.ticks, total);
            if (d.ticks % 2 == 0) sendCrack(d.block, progress);
            if (d.ticks % 4 == 0) {
                p.sendActionBar(Msg.get("totem.dig-progress", "percent", Math.round(progress * 100),
                        "seconds", String.format(java.util.Locale.ROOT, "%.1f", Math.max(0, (total - d.ticks) / 20.0))));
                d.block.getWorld().playSound(d.block.getLocation(), Sound.BLOCK_STONE_HIT, 0.5f, 0.8f);
            }
            if (fr.vaeloria.factions.rules.DigTimer.done(d.ticks, total)) {
                digs.remove(e.getKey());
                Block b = d.block;
                // Les autres joueurs qui frappaient ce bloc repartent de zéro.
                digs.values().removeIf(o -> o.block.equals(b));
                clearCrack(b);
                HitResult r = hit(p, b);
                if (r == HitResult.BROKEN) {
                    b.getWorld().spawnParticle(Particle.BLOCK, b.getLocation().add(0.5, 0.5, 0.5), 40, 0.3, 0.3, 0.3, b.getBlockData());
                    b.getWorld().playSound(b.getLocation(), Sound.BLOCK_STONE_BREAK, 1f, 0.6f);
                    b.setType(Material.AIR, false);
                }
                if (r == HitResult.WON || active == null) {
                    digs.clear();
                    return;
                }
            }
        }
    }

    /**
     * Le joueur vise-t-il toujours le totem ? On accepte toute la colonne : à la jointure de deux blocs, le lancer de
     * rayon du serveur tombe facilement sur le voisin, et le client signale de lui-même un changement de bloc.
     */
    private boolean lookingAtTotem(Player p, Block b) {
        if (p.getEyeLocation().distanceSquared(b.getLocation().add(0.5, 0.5, 0.5)) > 6.5 * 6.5) return false;
        Block target = p.getTargetBlockExact(6);
        return target != null && active != null && active.def.contains(target, settings.totemHeight);
    }

    public String itemName() {
        return settings.totemRequiredItem == null ? "n'importe quel objet"
                : settings.totemRequiredItem == Material.DIAMOND_SWORD ? "une épée en diamant"
                : settings.totemRequiredItem.name().toLowerCase(Locale.ROOT).replace('_', ' ');
    }

    public enum HitResult { NOT_ACTIVE, NO_FACTION, BROKEN, WON }

    /** Un joueur casse un bloc du totem actif. Le bloc cassé est retiré par l'événement lui-même. */
    public HitResult hit(Player p, Block b) {
        if (active == null || !active.def.contains(b, settings.totemHeight)) return HitResult.NOT_ACTIVE;
        Faction f = plugin.manager().factionOf(p);
        if (f == null) return HitResult.NO_FACTION;
        TotemProgress.Outcome o = active.progress.hit(f.id);
        Location fx = b.getLocation().add(0.5, 0.5, 0.5);
        b.getWorld().spawnParticle(Particle.REVERSE_PORTAL, fx, 40, 0.3, 0.3, 0.3, 0.05);
        switch (o) {
            case WIN -> {
                win(p, f);
                return HitResult.WON;
            }
            case TAKEOVER -> {
                // Une nouvelle faction prend la main : le totem repousse (sauf le bloc qu'elle vient de casser).
                build(active.def, b);
                b.getWorld().playSound(fx, Sound.BLOCK_RESPAWN_ANCHOR_CHARGE, 1.2f, 0.8f);
                Bukkit.broadcast(Msg.prefixed("totem.takeover", "faction", f.name, "player", p.getName(),
                        "left", active.progress.remaining(), "totem", active.def.name));
            }
            case PROGRESS -> {
                b.getWorld().playSound(fx, Sound.BLOCK_ANVIL_LAND, 0.6f, 1.4f);
                if (active.progress.broken() == 1) {
                    Bukkit.broadcast(Msg.prefixed("totem.first-hit", "faction", f.name, "player", p.getName(),
                            "left", active.progress.remaining(), "totem", active.def.name));
                }
            }
        }
        refresh();
        return HitResult.BROKEN;
    }

    private void win(Player p, Faction f) {
        Active a = active;
        active = null;
        cleanup(a);
        clear(a.def);
        f.totemsWon++;
        plugin.manager().markDirty();
        Location top = new Location(a.def.bukkitWorld(), a.def.x + 0.5, a.def.y + settings.totemHeight, a.def.z + 0.5);
        top.getWorld().spawnParticle(Particle.TOTEM_OF_UNDYING, top, 200, 0.6, 1.5, 0.6, 0.4);
        top.getWorld().playSound(top, Sound.UI_TOAST_CHALLENGE_COMPLETE, 2f, 1f);
        Title t = Title.title(Msg.get("totem.win-title", "faction", f.name), Msg.get("totem.win-subtitle", "player", p.getName(), "totem", a.def.name),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(4), Duration.ofMillis(600)));
        for (Player o : Bukkit.getOnlinePlayers()) o.showTitle(t);
        Bukkit.broadcast(Msg.prefixed("totem.won", "faction", f.name, "player", p.getName(), "totem", a.def.name));

        // Récompenses
        List<String> rewards = new ArrayList<>();
        if (settings.totemRewardMoney > 0) {
            f.bank += settings.totemRewardMoney;
            rewards.add(plugin.bank().format(settings.totemRewardMoney) + " en banque");
        }
        if (settings.totemRewardPower != 0) {
            f.powerBoost += settings.totemRewardPower;
            rewards.add("+" + Msg.fmt(settings.totemRewardPower) + " power de faction");
        }
        for (String cmd : settings.totemRewardCommands) {
            String c = cmd.replace("{player}", p.getName()).replace("{faction}", f.name).replace("{totem}", a.def.name);
            Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
        }
        if (!rewards.isEmpty()) {
            for (Player m : plugin.manager().online(f)) Msg.send(m, "totem.reward", "rewards", String.join(", ", rewards));
        }
        plugin.logs().add(f, "TOTEM", p.getName(), "a abattu le totem " + a.def.name);
        plugin.bridge().kothCapture("Totem " + a.def.name, f, p.getUniqueId(), p.getName());
        plugin.discord().totem("🏆 Totem " + a.def.name, "**" + f.name + "** abat le totem ! Dernier coup : **" + p.getName() + "**.");
    }

    // ── Affichage ──

    private void spawnHologram() {
        if (!settings.totemHologram || active == null) return;
        World w = active.def.bukkitWorld();
        Location l = new Location(w, active.def.x + 0.5, active.def.y + settings.totemHeight + 0.8, active.def.z + 0.5);
        active.hologram = w.spawn(l, TextDisplay.class, td -> {
            td.setBillboard(Display.Billboard.CENTER);
            td.setPersistent(false); // jamais sauvegardé avec le chunk : pas d'hologramme fantôme après un crash
            td.setShadowed(true);
            td.setSeeThrough(false);
            td.getPersistentDataContainer().set(hologramKey, PersistentDataType.BYTE, (byte) 1);
        });
    }

    /** Met à jour hologramme et barre de boss. */
    public void refresh() {
        if (active == null) return;
        TotemProgress pr = active.progress;
        Faction holder = plugin.manager().byId(pr.faction());
        long left = Math.max(0, active.endsAt - System.currentTimeMillis());
        Component holderC = holder == null ? Msg.get("totem.nobody") : Msg.parse("<gold><n>", "n", holder.name);
        active.bar.name(Msg.get("totem.bossbar", "totem", active.def.name, "holder", holderC,
                "broken", pr.broken(), "height", pr.height(), "time", Msg.duration(left),
                "x", active.def.x, "z", active.def.z));
        active.bar.progress(Math.max(0f, Math.min(1f, (float) pr.remaining() / pr.height())));
        if (active.hologram != null && active.hologram.isValid()) {
            active.hologram.text(Msg.get("totem.hologram", "totem", active.def.name, "holder", holderC,
                    "broken", pr.broken(), "height", pr.height(), "time", Msg.duration(left)));
        }
    }

    public void onJoin(Player p) {
        if (active != null) p.showBossBar(active.bar);
    }

    /** Chaque seconde : fin de temps, hologramme ; chaque minute : programmation. */
    public void tick() {
        if (active != null) {
            if (System.currentTimeMillis() >= active.endsAt) stop(true);
            else refresh();
        }
        if (settings.totemSchedule.isEmpty()) return;
        ZonedDateTime now = ZonedDateTime.now(settings.zone);
        String key = now.getDayOfYear() + ":" + now.getHour() + ":" + now.getMinute();
        if (key.equals(lastScheduleKey)) return;
        lastScheduleKey = key;
        for (TotemSchedule.Entry e : settings.totemSchedule) {
            if (!e.matches(now)) continue;
            StartResult r = start(e.totem(), 0, true);
            if (r != StartResult.OK && r != StartResult.ALREADY_RUNNING) {
                plugin.getLogger().warning("Totem programmé non lancé (" + e + ") : " + r);
            }
            break;
        }
    }

    /** Au démarrage : supprime les hologrammes laissés par un ancien plantage dans les chunks chargés. */
    public void purgeOrphans() {
        for (World w : Bukkit.getWorlds()) {
            for (Entity en : w.getEntitiesByClass(TextDisplay.class)) {
                if (en.getPersistentDataContainer().has(hologramKey, PersistentDataType.BYTE)) en.remove();
            }
        }
    }

    public void shutdown() {
        if (active == null) return;
        Active a = active;
        active = null;
        cleanup(a);
        clear(a.def);
    }

    /** Résumé pour /f totem. */
    public Component status() {
        if (active == null) {
            String next = settings.totemSchedule.isEmpty() ? Msg.raw("totem.no-schedule") : describeSchedule();
            return Msg.prefixed("totem.idle", "next", next);
        }
        Faction holder = plugin.manager().byId(active.progress.faction());
        return Msg.prefixed("totem.status", "totem", active.def.name, "x", active.def.x, "y", active.def.y, "z", active.def.z,
                "holder", holder == null ? Msg.get("totem.nobody") : Msg.parse("<gold><n>", "n", holder.name),
                "broken", active.progress.broken(), "height", active.progress.height(),
                "time", Msg.duration(active.endsAt - System.currentTimeMillis()));
    }

    private String describeSchedule() {
        List<String> l = new ArrayList<>();
        for (TotemSchedule.Entry e : settings.totemSchedule) {
            String day = e.day() == null ? "tous les jours" : e.day().getDisplayName(java.time.format.TextStyle.FULL, Locale.FRENCH);
            l.add(day + " " + String.format("%02dh%02d", e.hour(), e.minute()));
        }
        return String.join(", ", l);
    }
}
