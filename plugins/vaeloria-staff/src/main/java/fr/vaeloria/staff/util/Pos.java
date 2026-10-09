package fr.vaeloria.staff.util;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.World;
import org.bukkit.configuration.ConfigurationSection;

/** Position enregistrée par nom de monde : reste valable même si le monde n'est pas (encore) chargé. */
public record Pos(String world, double x, double y, double z, float yaw, float pitch) {

    public static Pos of(Location l) {
        return new Pos(l.getWorld().getName(), l.getX(), l.getY(), l.getZ(), l.getYaw(), l.getPitch());
    }

    /** @return la position, ou {@code null} si le monde n'est pas chargé. */
    public Location toLocation() {
        World w = Bukkit.getWorld(world);
        return w == null ? null : new Location(w, x, y, z, yaw, pitch);
    }

    /** Monde chargé et chunk chargé : on peut y faire apparaître une entité. */
    public boolean isLoaded() {
        World w = Bukkit.getWorld(world);
        return w != null && w.isChunkLoaded((int) Math.floor(x) >> 4, (int) Math.floor(z) >> 4);
    }

    public String describe() {
        return world + " " + (int) Math.floor(x) + " " + (int) Math.floor(y) + " " + (int) Math.floor(z);
    }

    public void write(ConfigurationSection s, String path) {
        s.set(path + ".world", world);
        s.set(path + ".x", x);
        s.set(path + ".y", y);
        s.set(path + ".z", z);
        s.set(path + ".yaw", (double) yaw);
        s.set(path + ".pitch", (double) pitch);
    }

    public static Pos read(ConfigurationSection s, String path) {
        String w = s.getString(path + ".world");
        if (w == null) return null;
        return new Pos(w, s.getDouble(path + ".x"), s.getDouble(path + ".y"), s.getDouble(path + ".z"),
                (float) s.getDouble(path + ".yaw"), (float) s.getDouble(path + ".pitch"));
    }
}
