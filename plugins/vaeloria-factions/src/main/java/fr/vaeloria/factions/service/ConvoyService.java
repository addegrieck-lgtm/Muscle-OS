package fr.vaeloria.factions.service;

import fr.vaeloria.factions.VaeloriaFactionsPlugin;
import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Pos;
import fr.vaeloria.factions.model.Zone;
import fr.vaeloria.factions.rules.ConvoyRules;
import fr.vaeloria.factions.storage.Store;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextDecoration;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.entity.FallingBlock;
import org.bukkit.entity.Item;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Le convoi : toutes les N minutes une caisse tombe en warzone. Qui l'ouvre récupère la Clé du convoi ; il doit la
 * rapporter à un avant-poste de sa faction (ou, si sa faction n'en tient aucun, sortir de la warzone) pour gagner.
 * La clé ne se range pas, ne se perd pas, et le porteur brille : il faut la défendre jusqu'au bout.
 */
public final class ConvoyService {
    public enum Phase { IDLE, FALLING, LANDED, CARRIED }

    private final VaeloriaFactionsPlugin plugin;
    private final Settings settings;
    private final Store.State state;
    private final NamespacedKey keyTag;
    private final NamespacedKey crateTag;

    private Phase phase = Phase.IDLE;
    private String convoyId;
    private Location crate;
    private Location target;
    private FallingBlock falling;
    private long fallingSince;
    private long endsAt;
    private long nextAt;
    private long lastReveal;
    private UUID carrier;
    private final Map<UUID, Integer> opening = new HashMap<>();
    private final Map<UUID, Location> openingFrom = new HashMap<>();
    private final BossBar bar = BossBar.bossBar(Component.empty(), 1f, BossBar.Color.BLUE, BossBar.Overlay.PROGRESS);

    public ConvoyService(VaeloriaFactionsPlugin plugin, Settings settings, Store.State state) {
        this.plugin = plugin;
        this.settings = settings;
        this.state = state;
        this.keyTag = new NamespacedKey(plugin, "convoy_key");
        this.crateTag = new NamespacedKey(plugin, "convoy_crate");
        this.nextAt = System.currentTimeMillis() + settings.convoyIntervalMinutes * 60_000L;
    }

    public Phase phase() { return phase; }
    public long nextIn() { return Math.max(0, nextAt - System.currentTimeMillis()); }
    public Location crateLocation() { return crate; }
    public UUID carrier() { return carrier; }
    public List<Pos> drops() { return state.convoyDrops; }
    public void rescheduleFromNow() { nextAt = System.currentTimeMillis() + settings.convoyIntervalMinutes * 60_000L; }

    // ── Clé ──

    public ItemStack key() {
        ItemStack it = new ItemStack(Material.TRIPWIRE_HOOK);
        ItemMeta meta = it.getItemMeta();
        meta.displayName(Msg.get("convoy.key-name").decoration(TextDecoration.ITALIC, false));
        meta.lore(List.of(Msg.get("convoy.key-lore-1").decoration(TextDecoration.ITALIC, false),
                Msg.get("convoy.key-lore-2").decoration(TextDecoration.ITALIC, false)));
        meta.setEnchantmentGlintOverride(true);
        meta.getPersistentDataContainer().set(keyTag, PersistentDataType.STRING, convoyId == null ? "" : convoyId);
        it.setItemMeta(meta);
        return it;
    }

    public boolean isKey(ItemStack it) {
        return it != null && it.getType() == Material.TRIPWIRE_HOOK && it.hasItemMeta()
                && it.getItemMeta().getPersistentDataContainer().has(keyTag, PersistentDataType.STRING);
    }

    /** Clé du convoi en cours (une ancienne clé, d'un convoi terminé, ne vaut plus rien). */
    public boolean isCurrentKey(ItemStack it) {
        return isKey(it) && convoyId != null && convoyId.equals(it.getItemMeta().getPersistentDataContainer().get(keyTag, PersistentDataType.STRING));
    }

    private static void removeKeys(Player p, ConvoyService s) {
        for (ItemStack it : p.getInventory().getContents()) if (s.isKey(it)) p.getInventory().remove(it);
        if (s.isKey(p.getItemOnCursor())) p.setItemOnCursor(null);
    }

    // ── Déroulement ──

    public enum StartResult { OK, DISABLED, ALREADY_RUNNING, NO_LOCATION, NOT_ENOUGH_PLAYERS }

    public StartResult start(boolean scheduled) {
        if (!settings.convoyEnabled) return StartResult.DISABLED;
        if (phase != Phase.IDLE) return StartResult.ALREADY_RUNNING;
        if (scheduled && Bukkit.getOnlinePlayers().size() < settings.convoyMinOnline) return StartResult.NOT_ENOUGH_PLAYERS;
        Location t = pickTarget();
        if (t == null) return StartResult.NO_LOCATION;
        convoyId = UUID.randomUUID().toString();
        target = t;
        endsAt = System.currentTimeMillis() + settings.convoyDurationMinutes * 60_000L;
        Location from = t.clone().add(0.5, settings.convoyFallHeight, 0.5);
        falling = t.getWorld().spawn(from, FallingBlock.class, fb -> {
            fb.setBlockData(Material.CHEST.createBlockData());
            fb.setDropItem(false);
            fb.setHurtEntities(false);
            fb.setGlowing(true);
            fb.getPersistentDataContainer().set(crateTag, PersistentDataType.STRING, convoyId);
        });
        fallingSince = System.currentTimeMillis();
        phase = Phase.FALLING;
        Bukkit.broadcast(Msg.prefixed("convoy.incoming", "x", t.getBlockX(), "z", t.getBlockZ()));
        Title title = Title.title(Msg.get("convoy.title"), Msg.get("convoy.subtitle", "x", t.getBlockX(), "z", t.getBlockZ()),
                Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
        for (Player p : Bukkit.getOnlinePlayers()) {
            p.showTitle(title);
            p.playSound(p.getLocation(), Sound.ITEM_GOAT_HORN_SOUND_0, 1f, 1f);
            p.showBossBar(bar);
        }
        plugin.discord().totem("📦 Convoi", "Une caisse tombe en warzone en **" + t.getBlockX() + ", " + t.getBlockZ() + "** !");
        return StartResult.OK;
    }

    /** Point d'atterrissage : un point défini par le staff, sinon un chunk de warzone au hasard. */
    private Location pickTarget() {
        List<Location> candidates = new ArrayList<>();
        for (Pos p : state.convoyDrops) {
            Location l = p.toLocation();
            if (l != null) candidates.add(l);
        }
        if (candidates.isEmpty()) {
            Faction wz = plugin.manager().warzone();
            if (wz == null || wz.claims.isEmpty()) return null;
            List<ChunkPos> chunks = new ArrayList<>(wz.claims);
            ChunkPos c = chunks.get(ThreadLocalRandom.current().nextInt(chunks.size()));
            World w = Bukkit.getWorld(c.world());
            if (w == null) return null;
            candidates.add(new Location(w, c.x() * 16 + 4 + ThreadLocalRandom.current().nextInt(8), 0, c.z() * 16 + 4 + ThreadLocalRandom.current().nextInt(8)));
            Location l = candidates.get(0);
            l.setY(w.getHighestBlockYAt(l) + 1);
            return l.getBlock().getLocation();
        }
        Location l = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
        return l.getBlock().getLocation();
    }

    /** Le bloc tombé se pose : c'est la caisse. */
    public void onLanded(FallingBlock fb, Block where) {
        if (convoyId == null || !convoyId.equals(fb.getPersistentDataContainer().get(crateTag, PersistentDataType.STRING))) return;
        land(where.getLocation());
    }

    public boolean isCrateEntity(FallingBlock fb) {
        return fb.getPersistentDataContainer().has(crateTag, PersistentDataType.STRING);
    }

    private void land(Location l) {
        falling = null;
        crate = l.getBlock().getLocation();
        if (crate.getBlock().getType() != Material.CHEST) crate.getBlock().setType(Material.CHEST, false);
        phase = Phase.LANDED;
        World w = crate.getWorld();
        w.spawnParticle(Particle.EXPLOSION_EMITTER, crate.clone().add(0.5, 0.5, 0.5), 1);
        w.playSound(crate, Sound.ENTITY_GENERIC_EXPLODE, 1.5f, 0.8f);
        Bukkit.broadcast(Msg.prefixed("convoy.landed", "x", crate.getBlockX(), "y", crate.getBlockY(), "z", crate.getBlockZ(),
                "seconds", settings.convoyOpenSeconds));
    }

    public boolean isCrate(Block b) {
        return crate != null && phase == Phase.LANDED && b.getLocation().equals(crate);
    }

    /** Clic droit sur la caisse : ouverture en restant à côté quelques secondes. */
    public void startOpening(Player p) {
        if (phase != Phase.LANDED) return;
        if (settings.convoyOpenSeconds <= 0) {
            claim(p);
            return;
        }
        if (opening.putIfAbsent(p.getUniqueId(), 0) == null) {
            openingFrom.put(p.getUniqueId(), p.getLocation());
            Msg.send(p, "convoy.opening", "seconds", settings.convoyOpenSeconds);
        }
    }

    public void interruptOpening(Player p) {
        if (opening.remove(p.getUniqueId()) != null) {
            openingFrom.remove(p.getUniqueId());
            p.sendActionBar(Msg.get("convoy.opening-interrupted"));
        }
    }

    private void claim(Player p) {
        opening.clear();
        openingFrom.clear();
        crate.getBlock().setType(Material.AIR, false);
        crate.getWorld().spawnParticle(Particle.TOTEM_OF_UNDYING, crate.clone().add(0.5, 0.8, 0.5), 60, 0.4, 0.6, 0.4, 0.3);
        crate.getWorld().playSound(crate, Sound.BLOCK_CHEST_OPEN, 1.2f, 0.7f);
        ItemStack k = key();
        var left = p.getInventory().addItem(k);
        if (!left.isEmpty()) dropKey(p.getLocation(), k);
        else carrier = p.getUniqueId();
        phase = Phase.CARRIED;
        Faction f = plugin.manager().factionOf(p);
        int held = f == null ? 0 : plugin.captures().heldBy(f);
        Bukkit.broadcast(Msg.prefixed(held > 0 ? "convoy.claimed-outpost" : "convoy.claimed-leave",
                "player", p.getName(), "faction", f == null ? "sans faction" : f.name));
        lastReveal = System.currentTimeMillis();
    }

    private void dropKey(Location l, ItemStack k) {
        Item item = l.getWorld().dropItem(l, k);
        item.setInvulnerable(true);
        item.setUnlimitedLifetime(true);
        item.setGlowing(true);
        carrier = null;
    }

    // ── Événements de la clé (appelés par ConvoyListener) ──

    public void pickedUp(Player p) {
        carrier = p.getUniqueId();
        Faction f = plugin.manager().factionOf(p);
        Bukkit.broadcast(Msg.prefixed("convoy.picked", "player", p.getName(), "faction", f == null ? "sans faction" : f.name));
    }

    public void dropped() {
        carrier = null;
    }

    /** Le porteur se déconnecte : la clé tombe là où il était. */
    public void carrierQuit(Player p) {
        if (!p.getUniqueId().equals(carrier)) return;
        for (ItemStack it : p.getInventory().getContents()) {
            if (isCurrentKey(it)) {
                p.getInventory().remove(it);
                dropKey(p.getLocation(), it);
            }
        }
        Bukkit.broadcast(Msg.prefixed("convoy.carrier-quit", "player", p.getName()));
    }

    public Item prepareDroppedKey(Item item) {
        item.setInvulnerable(true);
        item.setUnlimitedLifetime(true);
        item.setGlowing(true);
        return item;
    }

    // ── Boucle (chaque seconde) ──

    public void tick() {
        long now = System.currentTimeMillis();
        if (phase == Phase.IDLE) {
            if (settings.convoyEnabled && now >= nextAt) {
                StartResult r = start(true);
                nextAt = now + settings.convoyIntervalMinutes * 60_000L;
                if (r != StartResult.OK && r != StartResult.NOT_ENOUGH_PLAYERS) plugin.getLogger().warning("Convoi non lancé : " + r);
            }
            return;
        }
        if (now >= endsAt) {
            end(null, "timeout");
            return;
        }
        switch (phase) {
            case FALLING -> {
                if (falling == null || !falling.isValid()) {
                    if (now - fallingSince > 1500) land(target);
                } else if (now - fallingSince > 20_000) {
                    falling.remove();
                    land(target);
                }
            }
            case LANDED -> tickOpening();
            case CARRIED -> tickCarrier(now);
            default -> { }
        }
        refreshBar(now);
    }

    private void tickOpening() {
        crate.getWorld().spawnParticle(Particle.END_ROD, crate.clone().add(0.5, 1.5, 0.5), 8, 0.1, 3, 0.1, 0.01);
        for (var it = new ArrayList<>(opening.entrySet()).iterator(); it.hasNext(); ) {
            var e = it.next();
            Player p = Bukkit.getPlayer(e.getKey());
            Location from = openingFrom.get(e.getKey());
            if (p == null || p.isDead() || from == null || p.getWorld() != crate.getWorld()
                    || p.getLocation().distanceSquared(from) > 2.25 || p.getLocation().distanceSquared(crate.clone().add(0.5, 0, 0.5)) > 25) {
                if (p != null) interruptOpening(p);
                else opening.remove(e.getKey());
                continue;
            }
            int t = e.getValue() + 1;
            opening.put(e.getKey(), t);
            p.sendActionBar(Msg.get("convoy.opening-progress", "seconds", Math.max(0, settings.convoyOpenSeconds - t)));
            if (t >= settings.convoyOpenSeconds) {
                claim(p);
                return;
            }
        }
    }

    private void tickCarrier(long now) {
        Player p = carrier == null ? null : Bukkit.getPlayer(carrier);
        if (p == null) return; // clé au sol : attend d'être ramassée
        boolean hasKey = false;
        for (ItemStack it : p.getInventory().getContents()) if (isCurrentKey(it)) { hasKey = true; break; }
        if (!hasKey) {
            carrier = null;
            return;
        }
        p.addPotionEffect(new PotionEffect(PotionEffectType.GLOWING, 40, 0, true, false));
        Faction f = plugin.manager().factionOf(p);
        List<Zone> aps = new ArrayList<>();
        if (f != null) for (Zone z : plugin.captures().zones(Zone.Kind.OUTPOST)) if (f.id.equals(z.holder)) aps.add(z);
        boolean inOwnAp = false;
        for (Zone z : aps) if (z.contains(p.getLocation())) { inOwnAp = true; break; }
        Faction here = plugin.manager().factionAt(p.getLocation());
        boolean inWarzone = here != null && here.isWarzone();
        if (ConvoyRules.won(aps.size(), inOwnAp, inWarzone)) {
            end(p, aps.isEmpty() ? "left" : "outpost");
            return;
        }
        if (aps.isEmpty()) {
            p.sendActionBar(Msg.get("convoy.goal-leave"));
        } else {
            Zone nearest = aps.get(0);
            double best = Double.MAX_VALUE;
            for (Zone z : aps) {
                if (!z.world.equals(p.getWorld().getName())) continue;
                double d = Math.hypot(p.getLocation().getX() - z.x, p.getLocation().getZ() - z.z);
                if (d < best) { best = d; nearest = z; }
            }
            p.sendActionBar(Msg.get("convoy.goal-outpost", "outpost", nearest.name, "x", nearest.x, "z", nearest.z,
                    "distance", best == Double.MAX_VALUE ? "?" : String.valueOf((int) best)));
        }
        if (now - lastReveal >= settings.convoyRevealSeconds * 1000L) {
            lastReveal = now;
            Bukkit.broadcast(Msg.prefixed("convoy.reveal", "player", p.getName(), "faction", f == null ? "sans faction" : f.name,
                    "x", p.getLocation().getBlockX(), "z", p.getLocation().getBlockZ()));
        }
    }

    private void refreshBar(long now) {
        Component name;
        switch (phase) {
            case FALLING -> name = Msg.get("convoy.bar-falling", "x", target.getBlockX(), "z", target.getBlockZ());
            case LANDED -> name = Msg.get("convoy.bar-landed", "x", crate.getBlockX(), "z", crate.getBlockZ(), "time", Msg.duration(endsAt - now));
            default -> {
                Player p = carrier == null ? null : Bukkit.getPlayer(carrier);
                Faction f = p == null ? null : plugin.manager().factionOf(p);
                name = p == null ? Msg.get("convoy.bar-dropped", "time", Msg.duration(endsAt - now))
                        : Msg.get("convoy.bar-carried", "player", p.getName(), "faction", f == null ? "sans faction" : f.name,
                        "time", Msg.duration(endsAt - now));
            }
        }
        bar.name(name);
        bar.progress(Math.max(0f, Math.min(1f, (endsAt - now) / (settings.convoyDurationMinutes * 60_000f))));
    }

    /** Fin du convoi. winner null = personne (temps écoulé ou arrêt). */
    public void end(Player winner, String reason) {
        if (phase == Phase.IDLE) return;
        if (falling != null && falling.isValid()) falling.remove();
        if (crate != null && crate.getBlock().getType() == Material.CHEST && phase == Phase.LANDED) crate.getBlock().setType(Material.AIR, false);
        // Toutes les clés de ce convoi disparaissent.
        for (Player p : Bukkit.getOnlinePlayers()) {
            for (ItemStack it : p.getInventory().getContents()) if (isCurrentKey(it)) p.getInventory().remove(it);
            p.hideBossBar(bar);
        }
        for (World w : Bukkit.getWorlds()) {
            for (Item it : w.getEntitiesByClass(Item.class)) if (isCurrentKey(it.getItemStack())) it.remove();
        }
        if (winner != null) {
            Faction f = plugin.manager().factionOf(winner);
            List<String> rewards = new ArrayList<>();
            if (settings.convoyRewardMoney > 0) {
                if (f != null) {
                    f.bank += settings.convoyRewardMoney;
                    plugin.manager().markDirty();
                    rewards.add(plugin.bank().format(settings.convoyRewardMoney) + " en banque");
                } else if (plugin.bank().deposit(winner, settings.convoyRewardMoney)) {
                    rewards.add(plugin.bank().format(settings.convoyRewardMoney));
                }
            }
            for (String cmd : settings.convoyRewardCommands) {
                String c = cmd.replace("{player}", winner.getName()).replace("{faction}", f == null ? "" : f.name);
                Bukkit.dispatchCommand(Bukkit.getConsoleSender(), c.startsWith("/") ? c.substring(1) : c);
            }
            Bukkit.broadcast(Msg.prefixed("outpost".equals(reason) ? "convoy.won-outpost" : "convoy.won-left",
                    "player", winner.getName(), "faction", f == null ? "sans faction" : f.name));
            Title t = Title.title(Msg.get("convoy.win-title"), Msg.get("convoy.win-subtitle", "player", winner.getName(),
                    "faction", f == null ? "" : f.name), Title.Times.times(Duration.ofMillis(200), Duration.ofSeconds(3), Duration.ofMillis(500)));
            for (Player o : Bukkit.getOnlinePlayers()) o.showTitle(t);
            winner.playSound(winner.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f, 1f);
            if (!rewards.isEmpty()) Msg.send(winner, "convoy.reward", "rewards", String.join(", ", rewards));
            if (f != null) plugin.logs().add(f, "CONVOI", winner.getName(), "a rapporté la clé du convoi");
            plugin.discord().totem("📦 Convoi", "**" + winner.getName() + "**" + (f == null ? "" : " (" + f.name + ")") + " rapporte la clé du convoi !");
        } else {
            Bukkit.broadcast(Msg.prefixed("timeout".equals(reason) ? "convoy.timeout" : "convoy.stopped"));
        }
        phase = Phase.IDLE;
        convoyId = null;
        crate = null;
        falling = null;
        carrier = null;
        opening.clear();
        openingFrom.clear();
        nextAt = System.currentTimeMillis() + settings.convoyIntervalMinutes * 60_000L;
    }

    public void onJoin(Player p) {
        if (phase != Phase.IDLE) p.showBossBar(bar);
    }

    public void shutdown() {
        if (phase != Phase.IDLE) end(null, "stopped");
    }

    public static void stripKeys(Player p, ConvoyService s) { removeKeys(p, s); }
}
