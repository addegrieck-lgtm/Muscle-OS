package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.ChunkPos;
import fr.vaeloria.factions.model.FPerm;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.model.Relation;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.title.Title;
import org.bukkit.Bukkit;
import org.bukkit.Color;
import org.bukkit.Location;
import org.bukkit.Particle;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/** Affichage du territoire : entrée de zone, carte ASCII interactive, bordures de chunk, vol en territoire allié. */
public final class TerritoryService {
    private static final String MAP_CHARS = "\\/#$%=&^ABCDEFGHJKLMNOPQRSTUVWXYZ1234567890abcdeghjmnopqrsuvwxyz?";
    private static final String[] COMPASS = {"NO", "N", "NE", "O", "+", "E", "SO", "S", "SE"};
    private static final String[] COMPASS_GLYPHS = {"\\", "N", "/", "O", "+", "E", "/", "S", "\\"};

    private final JavaPlugin plugin;
    private final Settings settings;
    private final FactionManager manager;
    private final RaidService raid;
    private final Map<UUID, Integer> seeChunk = new ConcurrentHashMap<>();

    public TerritoryService(JavaPlugin plugin, Settings settings, FactionManager manager, RaidService raid) {
        this.plugin = plugin;
        this.settings = settings;
        this.manager = manager;
        this.raid = raid;
    }

    public String colorFor(Faction viewer, Faction owner) {
        if (owner == null) return "dark_green";
        if (owner.isSafezone()) return "gold";
        if (owner.isWarzone()) return "dark_red";
        return manager.relation(viewer, owner).color();
    }

    /** Annonce l'entrée dans un nouveau territoire. */
    public void announce(Player p, Faction owner) {
        Faction mine = manager.factionOf(p);
        String color = colorFor(mine, owner);
        Component name;
        Component sub;
        if (owner == null) {
            name = Msg.get("territory.wilderness", "color", color);
            sub = Msg.get("territory.wilderness-sub");
        } else {
            name = Msg.parse("<" + color + "><b><name></b>", "name", owner.name);
            String state = "";
            if (!owner.system) {
                if (owner.inRaid()) state = Msg.raw("territory.state-raid");
                else if (raid.shielded(owner)) state = Msg.raw("territory.state-shield");
                else if (manager.isVulnerable(owner)) state = Msg.raw("territory.state-vulnerable");
            }
            sub = Msg.parse("<gray><desc></gray>" + state, "desc", owner.description.isEmpty() ? manager.relation(mine, owner).label() : owner.description);
        }
        switch (settings.territoryDisplay) {
            case "CHAT" -> p.sendMessage(name.append(Component.text(" — ", NamedTextColor.DARK_GRAY)).append(sub));
            case "ACTIONBAR" -> p.sendActionBar(name.append(Component.text(" — ", NamedTextColor.DARK_GRAY)).append(sub));
            case "NONE" -> { }
            default -> p.showTitle(Title.title(name, sub, Title.Times.times(Duration.ofMillis(150), Duration.ofMillis(1500), Duration.ofMillis(400))));
        }
    }

    // ── Carte ──

    public void sendMap(Player p) {
        ChunkPos center = ChunkPos.of(p.getLocation());
        Faction mine = manager.factionOf(p);
        int halfW = 19, halfH = 5;
        Map<String, Character> letters = new HashMap<>();
        Map<String, Faction> legend = new java.util.LinkedHashMap<>();
        Faction here = manager.factionAt(center);
        p.sendMessage(Msg.get("map.header", "x", center.x(), "z", center.z(),
                "faction", here == null ? Msg.raw("territory.wilderness-name") : here.name, "color", colorFor(mine, here)));
        String facing = facing(p.getLocation().getYaw());
        for (int dz = -halfH; dz <= halfH; dz++) {
            TextComponent.Builder row = Component.text();
            // Boussole à gauche des trois premières lignes, comme l'ancienne /f map.
            int ci = dz + halfH;
            if (ci < 3) {
                for (int k = 0; k < 3; k++) {
                    String c = COMPASS[ci * 3 + k];
                    boolean on = c.equals(facing);
                    row.append(Component.text(COMPASS_GLYPHS[ci * 3 + k], on ? NamedTextColor.RED : NamedTextColor.GOLD));
                }
                row.append(Component.text(" "));
            } else {
                row.append(Component.text("    "));
            }
            for (int dx = -halfW; dx <= halfW; dx++) {
                ChunkPos c = center.offset(dx, dz);
                Faction f = manager.factionAt(c);
                Component cell;
                if (dx == 0 && dz == 0) {
                    cell = Component.text("+", NamedTextColor.AQUA);
                } else if (f == null) {
                    cell = Component.text("-", NamedTextColor.GRAY);
                } else if (f.system) {
                    cell = Component.text("+", f.isSafezone() ? NamedTextColor.GOLD : NamedTextColor.DARK_RED);
                } else {
                    char ch = letters.computeIfAbsent(f.id, k -> MAP_CHARS.charAt(Math.min(letters.size(), MAP_CHARS.length() - 1)));
                    legend.putIfAbsent(f.id, f);
                    cell = Component.text(String.valueOf(ch), color(manager.relation(mine, f)));
                }
                String owner = f == null ? Msg.raw("territory.wilderness-name") : f.name;
                cell = cell.hoverEvent(HoverEvent.showText(Msg.get("map.hover", "faction", owner, "x", c.x(), "z", c.z(),
                        "bx", c.x() * 16 + 8, "bz", c.z() * 16 + 8, "color", colorFor(mine, f))));
                if (dx == 0 && dz == 0) cell = cell.clickEvent(ClickEvent.runCommand("/f claim"));
                row.append(cell);
            }
            p.sendMessage(row.build());
        }
        TextComponent.Builder leg = Component.text();
        leg.append(Msg.get("map.legend"));
        for (Faction f : legend.values()) {
            leg.append(Component.text(" " + letters.get(f.id) + ": ", NamedTextColor.GRAY))
                    .append(Component.text(f.name, color(manager.relation(mine, f))));
        }
        p.sendMessage(leg.build());
    }

    private static TextColor color(Relation r) {
        return switch (r) {
            case MEMBRE -> NamedTextColor.GREEN;
            case ALLIE -> NamedTextColor.LIGHT_PURPLE;
            case TREVE -> NamedTextColor.AQUA;
            case ENNEMI -> NamedTextColor.RED;
            default -> NamedTextColor.WHITE;
        };
    }

    private static String facing(float yaw) {
        double rot = (yaw - 180) % 360;
        if (rot < 0) rot += 360;
        String[] dirs = {"N", "NE", "E", "SE", "S", "SO", "O", "NO"};
        return dirs[(int) Math.round(rot / 45.0) % 8];
    }

    // ── Bordures de chunk ──

    public void toggleSeeChunk(Player p) {
        Integer task = seeChunk.remove(p.getUniqueId());
        if (task != null) {
            Bukkit.getScheduler().cancelTask(task);
            Msg.send(p, "seechunk.hidden");
            return;
        }
        int id = Bukkit.getScheduler().runTaskTimer(plugin, () -> {
            if (!p.isOnline()) {
                Integer t = seeChunk.remove(p.getUniqueId());
                if (t != null) Bukkit.getScheduler().cancelTask(t);
                return;
            }
            drawBorder(p);
        }, 0L, 10L).getTaskId();
        seeChunk.put(p.getUniqueId(), id);
        Msg.send(p, "seechunk.shown");
    }

    private void drawBorder(Player p) {
        Location l = p.getLocation();
        Faction owner = manager.factionAt(l);
        Faction mine = manager.factionOf(p);
        Color c = owner == null ? Color.LIME : owner == mine ? Color.GREEN : owner.system ? Color.ORANGE
                : switch (manager.relation(mine, owner)) {
                    case ENNEMI -> Color.RED;
                    case ALLIE -> Color.FUCHSIA;
                    case TREVE -> Color.AQUA;
                    default -> Color.WHITE;
                };
        Particle.DustOptions dust = new Particle.DustOptions(c, 1.2f);
        int bx = (l.getBlockX() >> 4) << 4, bz = (l.getBlockZ() >> 4) << 4;
        double y0 = l.getY();
        for (double y = y0 - 1; y <= y0 + 3; y += 1) {
            for (int i = 0; i <= 16; i += 1) {
                p.spawnParticle(Particle.DUST, bx + i, y, bz, 1, dust);
                p.spawnParticle(Particle.DUST, bx + i, y, bz + 16, 1, dust);
                p.spawnParticle(Particle.DUST, bx, y, bz + i, 1, dust);
                p.spawnParticle(Particle.DUST, bx + 16, y, bz + i, 1, dust);
            }
        }
    }

    public void stopSeeChunk(UUID uuid) {
        Integer t = seeChunk.remove(uuid);
        if (t != null) Bukkit.getScheduler().cancelTask(t);
    }

    // ── Vol ──

    public boolean canFlyHere(Player p) {
        Faction owner = manager.factionAt(p.getLocation());
        Faction mine = manager.factionOf(p);
        if (owner == null || mine == null) return false;
        if (owner != mine && manager.relation(mine, owner) != Relation.ALLIE) return false;
        return mine.can(p.getUniqueId(), FPerm.FLY);
    }

    public Player enemyNearby(Player p, int radius) {
        if (radius <= 0) return null;
        Faction mine = manager.factionOf(p);
        for (Player o : p.getWorld().getPlayers()) {
            if (o == p || o.getGameMode() == org.bukkit.GameMode.SPECTATOR || !p.canSee(o)) continue;
            if (o.getLocation().distanceSquared(p.getLocation()) > (double) radius * radius) continue;
            Relation r = manager.relation(mine, manager.factionOf(o));
            if (r == Relation.ENNEMI || (r == Relation.NEUTRE && mine != null)) return o;
        }
        return null;
    }

    public void setFly(Player p, boolean on) {
        FPlayer fp = manager.fplayer(p);
        fp.flying = on;
        boolean creative = p.getGameMode() == org.bukkit.GameMode.CREATIVE || p.getGameMode() == org.bukkit.GameMode.SPECTATOR;
        if (!creative) {
            p.setAllowFlight(on);
            if (!on && p.isFlying()) {
                p.setFlying(false);
                p.setFallDistance(0);
                // Chute amortie : on évite de tuer le joueur pour être sorti de son territoire.
                p.addPotionEffect(new org.bukkit.potion.PotionEffect(org.bukkit.potion.PotionEffectType.SLOW_FALLING, 100, 0, true, false));
            }
        }
    }

    /** Chaque seconde : coupe le vol hors territoire ou à l'approche d'un ennemi. */
    public void tickFly() {
        for (Player p : Bukkit.getOnlinePlayers()) {
            FPlayer fp = manager.fplayer(p);
            if (!fp.flying) continue;
            if (!canFlyHere(p)) {
                setFly(p, false);
                Msg.send(p, "fly.left-territory");
            } else if (!p.hasPermission("vaeloria.factions.bypass.fly") && enemyNearby(p, settings.flyEnemyRadius) != null) {
                setFly(p, false);
                Msg.send(p, "fly.enemy-nearby");
            }
        }
    }
}
