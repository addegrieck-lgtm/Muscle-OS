package fr.vaeloria.factions.model;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;

/** Position sérialisable (home, warps). */
public final class Pos {
    public String world;
    public double x, y, z;
    public float yaw, pitch;

    public Pos() {}

    public static Pos of(Location l) {
        Pos p = new Pos();
        p.world = l.getWorld().getName();
        p.x = l.getX();
        p.y = l.getY();
        p.z = l.getZ();
        p.yaw = l.getYaw();
        p.pitch = l.getPitch();
        return p;
    }

    /** null si le monde n'est plus chargé. */
    public Location toLocation() {
        World w = Bukkit.getWorld(world);
        return w == null ? null : new Location(w, x, y, z, yaw, pitch);
    }

    public ChunkPos chunk() {
        return new ChunkPos(world, (int) Math.floor(x) >> 4, (int) Math.floor(z) >> 4);
    }
}
