package fr.vaeloria.arena;

import net.kyori.adventure.bossbar.BossBar;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import net.kyori.adventure.text.minimessage.tag.resolver.TagResolver;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Chunk;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.World;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Zombie;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;
import org.bukkit.scheduler.BukkitTask;
import org.bukkit.scoreboard.Scoreboard;
import org.bukkit.util.Vector;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Un combat de bots en P4 U3 : apparition, paris, compte à rebours, IA de combat (ciblage, golden apples,
 * strafe), limites de l'arène, annonces aux spectateurs, paiement des paris et nettoyage.
 *
 * Les bots sont des zombies sans IA « monstre » utile : ils ne ciblent que l'équipe adverse,
 * ne brûlent pas, ne lâchent rien et sont supprimés à la fin du combat.
 */
final class ArenaMatch {
    enum State { BETTING, COUNTDOWN, FIGHT, ENDED }

    private static final MiniMessage MM = MiniMessage.miniMessage();
    private static final long TICK_PERIOD = 5L;

    static final class Bot {
        final UUID id;
        final Team team;
        final String name;
        int gapples;
        long lastGappleTick = Long.MIN_VALUE / 2;
        int kills;
        boolean dead;
        String shownName = "";

        Bot(UUID id, Team team, String name, int gapples) {
            this.id = id;
            this.team = team;
            this.name = name;
            this.gapples = gapples;
        }
    }

    private final VaeloriaArenaPlugin plugin;
    private final ConfigurationSection cfg;
    private final Location center;
    private final double radius;
    private final int perTeam;
    private final Map<UUID, Bot> bots = new LinkedHashMap<>();
    private final Map<UUID, UUID> lastAttacker = new HashMap<>();
    private final MatchTally tally;
    private final List<Chunk> ticketed = new ArrayList<>();
    private final Map<Team, org.bukkit.scoreboard.Team> sbTeams = new EnumMap<>(Team.class);

    private final BetDesk desk; // null : combat sans paris (Vault absent ou paris désactivés)
    private final BossBar bar = BossBar.bossBar(Component.empty(), 1f, BossBar.Color.YELLOW, BossBar.Overlay.PROGRESS);
    private final Set<UUID> barViewers = new HashSet<>();

    private State state = State.COUNTDOWN;
    private BukkitTask task;
    private long ticks;
    private int countdown;
    private int betting;
    private boolean cleaned;

    ArenaMatch(VaeloriaArenaPlugin plugin, Location center, double radius, int perTeam, Bank bank) {
        this.plugin = plugin;
        this.cfg = plugin.getConfig();
        this.center = center.clone();
        this.radius = radius;
        this.perTeam = perTeam;
        this.tally = new MatchTally(perTeam);
        boolean bets = bank != null && cfg.getBoolean("bets.enabled", true) && cfg.getInt("bets.duration-seconds", 30) > 0;
        this.desk = bets ? new BetDesk(plugin, bank, cfg.getConfigurationSection("bets")) : null;
    }

    State state() {
        return state;
    }

    boolean owns(Entity e) {
        return bots.containsKey(e.getUniqueId());
    }

    Bot bot(Entity e) {
        return bots.get(e.getUniqueId());
    }

    // ------------------------------------------------------------------ démarrage

    void start() {
        loadChunks();
        setupScoreboardTeams();
        BotKit kit = new BotKit(cfg.getConfigurationSection("bot"));
        List<String> names = new ArrayList<>(cfg.getStringList("bot.names"));
        Collections.shuffle(names);
        int n = 0;
        for (Team team : Team.values()) {
            List<double[]> offsets = ArenaGeometry.spawnOffsets(team, perTeam,
                    cfg.getDouble("match.separation", 10), cfg.getDouble("match.spacing", 3));
            for (int i = 0; i < offsets.size(); i++) {
                String name = n < names.size() ? names.get(n) : team.label + "#" + (i + 1);
                n++;
                Location at = center.clone().add(offsets.get(i)[0], 0, offsets.get(i)[1]);
                at.setDirection(center.toVector().subtract(at.toVector()).setY(0));
                spawnBot(at, team, name, kit);
            }
        }
        countdown = Math.max(0, cfg.getInt("match.countdown-seconds", 3));
        String where = cfg.getString("match.where", "à l'arène du spawn");
        String head = "<gold>⚔ Combat de bots <white>" + perTeam + "v" + perTeam + "</white> en <aqua>P4 U3</aqua> "
                + "<white>(" + kit.weaponLabel() + ")</white> " + Msg.esc(where) + " !";
        if (desk != null) {
            state = State.BETTING;
            betting = cfg.getInt("bets.duration-seconds", 30);
            Component msg = Msg.of(head + " <yellow>Paris ouverts " + betting + " s</yellow> : "
                    + "<click:suggest_command:'/pari rouge '><hover:show_text:'<red>Miser sur Rouge'><red><bold>[Parier Rouge]</bold></red></hover></click> "
                    + "<click:suggest_command:'/pari bleu '><hover:show_text:'<blue>Miser sur Bleu'><blue><bold>[Parier Bleu]</bold></blue></hover></click>"
                    + " <gray>ou <white>/pari rouge|bleu <mise></white>");
            for (Player p : betAudience()) p.sendMessage(msg);
            plugin.getComponentLogger().info(msg);
        } else {
            broadcast(head);
        }
        updateBar();
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 1L, TICK_PERIOD);
    }

    private void spawnBot(Location at, Team team, String name, BotKit kit) {
        ConfigurationSection b = cfg.getConfigurationSection("bot");
        World world = at.getWorld();
        Zombie z = world.spawn(at, Zombie.class, false, mob -> {
            mob.setAdult();
            mob.setCanPickupItems(false);
            mob.setRemoveWhenFarAway(false);
            mob.setPersistent(false);
            mob.setAware(false); // immobiles pendant le compte à rebours
            mob.setSilent(false);
            mob.setGlowing(b.getBoolean("glowing", true));
            mob.setCustomNameVisible(true);
            setBase(mob, Attribute.MAX_HEALTH, b.getDouble("health", 20));
            setBase(mob, Attribute.MOVEMENT_SPEED, b.getDouble("speed", 0.35));
            setBase(mob, Attribute.ATTACK_DAMAGE, b.getDouble("base-attack-damage", 1.0));
            setBase(mob, Attribute.FOLLOW_RANGE, radius * 2 + 16);
            setBase(mob, Attribute.SPAWN_REINFORCEMENTS, 0);
            setBase(mob, Attribute.KNOCKBACK_RESISTANCE, 0);
            mob.setHealth(b.getDouble("health", 20));
            kit.equip(mob.getEquipment());
            mob.getPersistentDataContainer().set(plugin.botKey(), PersistentDataType.STRING, team.name());
        });
        Bot bot = new Bot(z.getUniqueId(), team, name, b.getInt("golden-apples", 2));
        bots.put(bot.id, bot);
        sbTeams.get(team).addEntry(bot.id.toString());
        refreshName(z, bot);
    }

    private static void setBase(LivingEntity e, Attribute attribute, double value) {
        AttributeInstance inst = e.getAttribute(attribute);
        if (inst != null) inst.setBaseValue(value);
    }

    private void setupScoreboardTeams() {
        Scoreboard sb = Bukkit.getScoreboardManager().getMainScoreboard();
        for (Team team : Team.values()) {
            String id = "varena_" + team.name().toLowerCase();
            org.bukkit.scoreboard.Team t = sb.getTeam(id);
            if (t == null) t = sb.registerNewTeam(id);
            for (String entry : new ArrayList<>(t.getEntries())) t.removeEntry(entry);
            t.color(team == Team.ROUGE ? NamedTextColor.RED : NamedTextColor.BLUE);
            t.setAllowFriendlyFire(false);
            sbTeams.put(team, t);
        }
    }

    private void loadChunks() {
        World world = center.getWorld();
        int r = (int) Math.ceil(radius / 16.0) + 1;
        int cx = center.getBlockX() >> 4;
        int cz = center.getBlockZ() >> 4;
        for (int x = cx - r; x <= cx + r; x++) {
            for (int z = cz - r; z <= cz + r; z++) {
                Chunk c = world.getChunkAt(x, z);
                if (c.addPluginChunkTicket(plugin)) ticketed.add(c);
            }
        }
    }

    // ------------------------------------------------------------------ boucle

    private void tick() {
        ticks += TICK_PERIOD;
        if (ticks % 20 < TICK_PERIOD) updateBar();
        if (state == State.BETTING) {
            if (ticks % 20 < TICK_PERIOD) bettingStep();
            return;
        }
        if (state == State.COUNTDOWN) {
            if (ticks % 20 < TICK_PERIOD) countdownStep();
            return;
        }
        if (state != State.FIGHT) return;

        int limit = cfg.getInt("match.max-duration-seconds", 120);
        if (limit > 0 && ticks >= limit * 20L) {
            broadcast("<yellow>⏱ Temps écoulé !");
            end(tally.winner());
            return;
        }
        for (Bot bot : List.copyOf(bots.values())) {
            if (bot.dead || !(Bukkit.getEntity(bot.id) instanceof Zombie z) || z.isDead()) continue;
            keepInside(z);
            retarget(z, bot);
            maybeEatGapple(z, bot);
            maybeStrafe(z);
            refreshName(z, bot);
        }
    }

    private void bettingStep() {
        betting--;
        if (betting == 30 || betting == 10) {
            Component msg = Msg.of("<yellow>Plus que " + betting + " s pour parier !</yellow> " + oddsLine()
                    + " <gray>— <white>/pari rouge|bleu <mise>");
            for (Player p : betAudience()) p.sendMessage(msg);
        }
        if (betting > 0) return;
        desk.close();
        broadcast("<gold>Paris fermés.</gold> " + oddsLine());
        state = State.COUNTDOWN;
    }

    private void countdownStep() {
        if (countdown > 0) {
            title(Component.text(countdown, NamedTextColor.GOLD), Component.text("Rouge vs Bleu — P4 U3", NamedTextColor.GRAY));
            sound(Sound.BLOCK_NOTE_BLOCK_HAT, 1f);
            countdown--;
            return;
        }
        state = State.FIGHT;
        ticks = 0;
        title(Component.text("COMBAT !", NamedTextColor.RED), Component.empty());
        sound(Sound.ENTITY_ENDER_DRAGON_GROWL, 1.2f);
        for (UUID id : bots.keySet()) {
            if (Bukkit.getEntity(id) instanceof Zombie z) z.setAware(true);
        }
    }

    private void keepInside(Zombie z) {
        Location l = z.getLocation();
        double dx = l.getX() - center.getX();
        double dz = l.getZ() - center.getZ();
        if (ArenaGeometry.isInside(dx, dz, radius)) return;
        if (!ArenaGeometry.isInside(dx, dz, radius + 4) || Math.abs(l.getY() - center.getY()) > 10) {
            double back = 0.8 * radius / Math.hypot(dx, dz);
            z.teleport(center.clone().add(dx * back, 0, dz * back));
            return;
        }
        Vector inward = new Vector(-dx, 0, -dz).normalize().multiply(0.4).setY(0.2);
        z.setVelocity(inward);
    }

    private void retarget(Zombie z, Bot bot) {
        LivingEntity current = z.getTarget();
        if (current != null && current.isValid() && !current.isDead()) {
            Bot other = bots.get(current.getUniqueId());
            if (other != null && other.team != bot.team && !other.dead) return;
        }
        LivingEntity best = null;
        double bestDist = Double.MAX_VALUE;
        for (Bot other : bots.values()) {
            if (other.team == bot.team || other.dead) continue;
            if (!(Bukkit.getEntity(other.id) instanceof LivingEntity e) || e.isDead()) continue;
            double d = e.getLocation().distanceSquared(z.getLocation());
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        z.setTarget(best);
    }

    private void maybeEatGapple(Zombie z, Bot bot) {
        ConfigurationSection b = cfg.getConfigurationSection("bot");
        if (bot.gapples <= 0 || z.getHealth() > b.getDouble("gapple-health-threshold", 6)) return;
        long cooldown = b.getLong("gapple-cooldown-seconds", 4) * 20L;
        if (ticks - bot.lastGappleTick < cooldown) return;
        bot.gapples--;
        bot.lastGappleTick = ticks;

        // Comme un joueur : la pomme en main un instant, puis l'arme revient.
        ItemStack weapon = z.getEquipment().getItemInMainHand();
        z.getEquipment().setItemInMainHand(new ItemStack(Material.GOLDEN_APPLE));
        z.addPotionEffect(new PotionEffect(PotionEffectType.REGENERATION, 100, 1));
        z.addPotionEffect(new PotionEffect(PotionEffectType.ABSORPTION, 2400, 0));
        z.getWorld().playSound(z.getLocation(), Sound.ENTITY_PLAYER_BURP, 1f, 1f);
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (z.isValid()) z.getEquipment().setItemInMainHand(weapon);
        }, 16L);
    }

    /** Petits déplacements latéraux près de la cible, façon PvP 1.8 (strafe / sauts). */
    private void maybeStrafe(Zombie z) {
        if (!cfg.getBoolean("bot.strafe", true) || !z.isOnGround()) return;
        LivingEntity t = z.getTarget();
        if (t == null) return;
        Vector toTarget = t.getLocation().toVector().subtract(z.getLocation().toVector()).setY(0);
        double dist = toTarget.length();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        if (dist < 0.1 || dist > 4 || rnd.nextDouble() > 0.3) return;
        Vector side = new Vector(-toTarget.getZ(), 0, toTarget.getX()).normalize().multiply(rnd.nextBoolean() ? 0.3 : -0.3);
        Vector forward = toTarget.normalize().multiply(0.12);
        z.setVelocity(side.add(forward).setY(rnd.nextDouble() < 0.3 ? 0.42 : 0));
    }

    private void refreshName(Zombie z, Bot bot) {
        String color = bot.team == Team.ROUGE ? "red" : "blue";
        double hp = Math.ceil(z.getHealth() + z.getAbsorptionAmount()) / 2.0;
        String shown = "<" + color + ">[" + bot.team.tag + "]</" + color + "> <white><name></white> <red>" + hp + "❤</red>";
        if (shown.equals(bot.shownName)) return;
        bot.shownName = shown;
        z.customName(MM.deserialize(shown, Placeholder.unparsed("name", bot.name)));
    }

    // ------------------------------------------------------------------ événements

    void recordHit(Entity victim, Entity attacker) {
        lastAttacker.put(victim.getUniqueId(), attacker.getUniqueId());
    }

    void onDeath(LivingEntity dead) {
        Bot victim = bots.get(dead.getUniqueId());
        if (victim == null || victim.dead) return;
        victim.dead = true;
        Bot killer = Optional.ofNullable(lastAttacker.remove(victim.id)).map(bots::get).orElse(null);
        if (killer != null && killer.team == victim.team) killer = null;
        tally.death(victim.team, killer == null ? null : killer.team);
        if (killer != null) killer.kills++;

        String line = killer == null
                ? teamName(victim.team, "victim") + " <gray>est mort."
                : teamName(killer.team, "killer") + " <gray>a tué " + teamName(victim.team, "victim");
        broadcast("<dark_gray>☠</dark_gray> " + line + score(),
                Placeholder.unparsed("victim", victim.name),
                Placeholder.unparsed("killer", killer == null ? "" : killer.name));
        dead.getWorld().playSound(dead.getLocation(), Sound.ENTITY_LIGHTNING_BOLT_THUNDER, 0.6f, 1.4f);

        if (state == State.FIGHT && tally.finished()) end(tally.winner());
    }

    private static String teamName(Team t, String placeholder) {
        String color = t == Team.ROUGE ? "red" : "blue";
        return "<" + color + "><" + placeholder + "></" + color + ">";
    }

    private String score() {
        return " <dark_gray>(<red>" + tally.alive(Team.ROUGE) + "</red> vs <blue>" + tally.alive(Team.BLEU) + "</blue>)";
    }

    // ------------------------------------------------------------------ fin

    private void end(Optional<Team> winner) {
        if (state == State.ENDED) return;
        state = State.ENDED;
        for (UUID id : bots.keySet()) {
            if (Bukkit.getEntity(id) instanceof Zombie z) {
                z.setTarget(null);
                z.setAware(false);
            }
        }
        if (winner.isPresent()) {
            Team w = winner.get();
            String color = w == Team.ROUGE ? "red" : "blue";
            title(MM.deserialize("<" + color + "><bold>Victoire " + w.label + " !"),
                    MM.deserialize("<gray>" + tally.kills(Team.ROUGE) + " – " + tally.kills(Team.BLEU) + " kills"));
            broadcast("<gold>🏆 L'équipe <" + color + ">" + w.label + "</" + color + "> remporte le combat !" + score());
        } else {
            title(Component.text("Égalité", NamedTextColor.YELLOW), Component.empty());
            broadcast("<yellow>Égalité parfaite !" + score());
        }
        bots.values().stream().filter(b -> b.kills > 0)
                .sorted((a, b) -> Integer.compare(b.kills, a.kills)).findFirst()
                .ifPresent(mvp -> broadcast("<gray>MVP : <white><mvp></white> (" + mvp.kills + " kill" + (mvp.kills > 1 ? "s" : "") + ")",
                        Placeholder.unparsed("mvp", mvp.name)));
        sound(Sound.UI_TOAST_CHALLENGE_COMPLETE, 1f);
        if (desk != null) desk.settle(winner);
        long delay = Math.max(1, cfg.getLong("match.cleanup-delay-seconds", 5)) * 20L;
        Bukkit.getScheduler().runTaskLater(plugin, this::cleanup, delay);
        if (task != null) task.cancel();
    }

    /** Arrêt immédiat (commande stop, désactivation du plugin). */
    void abort() {
        if (state != State.ENDED) {
            broadcast("<red>Combat de bots annulé.");
            if (desk != null) desk.refundAll("Combat annulé.");
        }
        state = State.ENDED;
        cleanup();
    }

    private void cleanup() {
        if (cleaned) return; // /botarena stop pendant le délai de fin, puis nettoyage programmé
        cleaned = true;
        if (task != null) task.cancel();
        for (UUID id : new ArrayList<>(bots.keySet())) {
            Entity e = Bukkit.getEntity(id);
            if (e != null) e.remove();
        }
        bots.clear();
        lastAttacker.clear();
        for (UUID id : barViewers) {
            Player p = Bukkit.getPlayer(id);
            if (p != null) p.hideBossBar(bar);
        }
        barViewers.clear();
        for (org.bukkit.scoreboard.Team t : sbTeams.values()) {
            try {
                t.unregister();
            } catch (IllegalStateException ignored) {
                // déjà supprimée
            }
        }
        for (Chunk c : ticketed) c.removePluginChunkTicket(plugin);
        ticketed.clear();
        plugin.matchFinished(this);
    }

    // ------------------------------------------------------------------ paris

    void bet(Player p, Team team, double amount) {
        if (desk == null) {
            p.sendMessage(Msg.of("<red>Pas de paris sur ce combat."));
            return;
        }
        desk.place(p, team, amount);
        updateBar();
    }

    void betInfo(Player p) {
        if (desk == null) {
            p.sendMessage(Msg.of("<gray>Pas de paris sur ce combat."));
            return;
        }
        BetBook book = desk.book();
        p.sendMessage(Msg.of((book.isOpen() ? "<green>Paris ouverts (" + betting + " s).</green> " : "<gray>Paris fermés.</gray> ") + oddsLine()));
        book.bet(p.getUniqueId()).ifPresent(b -> p.sendMessage(Msg.of("<gray>Ta mise : <white>" + desk.money(b.amount())
                + "</white> sur " + Msg.team(b.team()) + "<gray>, gain si victoire ≈ <gold>"
                + desk.money(BetBook.floorCents(b.amount() * book.odds(b.team()))))));
    }

    private String oddsLine() {
        BetBook book = desk.book();
        StringBuilder sb = new StringBuilder();
        for (Team t : Team.values()) {
            if (!sb.isEmpty()) sb.append(" <dark_gray>·</dark_gray> ");
            sb.append(Msg.team(t)).append(" <white>").append(desk.money(book.pool(t))).append("</white> <gray>(")
                    .append(book.bettors(t)).append(" parieur").append(book.bettors(t) > 1 ? "s" : "").append(", cote <gold>")
                    .append(Msg.odds(book.odds(t))).append("</gold>)</gray>");
        }
        return sb.toString();
    }

    /** Pendant les paris, tout le serveur (bets.announce-server-wide) ; sinon les spectateurs. */
    private Collection<Player> betAudience() {
        if (cfg.getBoolean("bets.announce-server-wide", true)) return List.copyOf(Bukkit.getOnlinePlayers());
        return audience();
    }

    private void updateBar() {
        String text;
        float progress = 1f;
        if (state == State.BETTING) {
            text = "<yellow>Paris ouverts <white>" + betting + " s</white> — " + oddsLine() + " <gray>— /pari";
            progress = Math.max(0f, Math.min(1f, betting / (float) Math.max(1, cfg.getInt("bets.duration-seconds", 30))));
        } else if (state == State.ENDED) {
            return;
        } else {
            String pot = desk == null || desk.book().bets().isEmpty() ? ""
                    : " <dark_gray>|</dark_gray> <gold>cagnotte " + desk.money(desk.book().pool(Team.ROUGE) + desk.book().pool(Team.BLEU)) + "</gold>";
            text = "<red>Rouge " + tally.alive(Team.ROUGE) + "</red> <gray>vs</gray> <blue>" + tally.alive(Team.BLEU)
                    + " Bleu</blue>" + pot;
            int limit = cfg.getInt("match.max-duration-seconds", 120);
            if (state == State.FIGHT && limit > 0) progress = Math.max(0f, 1f - ticks / (limit * 20f));
        }
        bar.name(Msg.MM.deserialize(text));
        bar.progress(progress);

        Set<UUID> want = new HashSet<>();
        for (Player p : state == State.BETTING ? betAudience() : audience()) want.add(p.getUniqueId());
        if (desk != null) desk.book().bets().keySet().forEach(want::add);
        for (UUID id : Set.copyOf(barViewers)) {
            if (want.contains(id)) continue;
            Player p = Bukkit.getPlayer(id);
            if (p != null) p.hideBossBar(bar);
            barViewers.remove(id);
        }
        for (UUID id : want) {
            Player p = Bukkit.getPlayer(id);
            if (p != null && barViewers.add(id)) p.showBossBar(bar);
        }
    }

    // ------------------------------------------------------------------ spectateurs

    String status() {
        return state + " — Rouge " + tally.alive(Team.ROUGE) + " (" + tally.kills(Team.ROUGE) + " kills) vs Bleu "
                + tally.alive(Team.BLEU) + " (" + tally.kills(Team.BLEU) + " kills), " + ticks / 20 + " s";
    }

    private Collection<Player> audience() {
        double range = radius + cfg.getDouble("spectators.range", 48);
        List<Player> out = new ArrayList<>();
        for (Player p : center.getWorld().getPlayers()) {
            if (p.getLocation().distanceSquared(center) <= range * range) out.add(p);
        }
        return out;
    }

    private void broadcast(String mini, TagResolver... resolvers) {
        Component msg = Msg.of(mini, resolvers);
        for (Player p : audience()) p.sendMessage(msg);
        plugin.getComponentLogger().info(msg);
    }

    private void title(Component main, Component sub) {
        Title t = Title.title(main, sub, Title.Times.times(Duration.ZERO, Duration.ofMillis(1200), Duration.ofMillis(300)));
        for (Player p : audience()) p.showTitle(t);
    }

    private void sound(Sound s, float pitch) {
        for (Player p : audience()) p.playSound(p.getLocation(), s, 1f, pitch);
    }
}
