package fr.vaeloria.factions.model;

import org.bukkit.Location;

/** Zone de capture : avant-poste (permanent) ou KOTH (événement). Cylindre de rayon donné, ±5 blocs en hauteur. */
public final class Zone {
    public enum Kind { OUTPOST, KOTH }

    public String name;
    public Kind kind;
    public String world;
    public int x, y, z;
    public int radius;
    /** Avant-poste : faction qui le tient (id), null si libre. */
    public String holder;
    public long heldSince;
    public long lastIncome;

    public Zone() {}

    public Zone(String name, Kind kind, Location l, int radius) {
        this.name = name;
        this.kind = kind;
        this.world = l.getWorld().getName();
        this.x = l.getBlockX();
        this.y = l.getBlockY();
        this.z = l.getBlockZ();
        this.radius = radius;
    }

    public boolean contains(Location l) {
        if (l.getWorld() == null || !l.getWorld().getName().equals(world)) return false;
        double dx = l.getX() - (x + 0.5), dz = l.getZ() - (z + 0.5);
        return dx * dx + dz * dz <= (double) radius * radius && Math.abs(l.getY() - y) <= 5;
    }

    public boolean near(Location l, int extra) {
        if (l.getWorld() == null || !l.getWorld().getName().equals(world)) return false;
        double dx = l.getX() - (x + 0.5), dz = l.getZ() - (z + 0.5);
        double r = radius + extra;
        return dx * dx + dz * dz <= r * r;
    }
}
