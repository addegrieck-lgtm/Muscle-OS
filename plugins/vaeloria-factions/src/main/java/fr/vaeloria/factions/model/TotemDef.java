package fr.vaeloria.factions.model;

import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.block.Block;

/** Emplacement d'un totem : la colonne part de (x, y, z) vers le haut. */
public final class TotemDef {
    public String name;
    public String world;
    public int x, y, z;

    public TotemDef() {}

    public TotemDef(String name, Block base) {
        this.name = name;
        this.world = base.getWorld().getName();
        this.x = base.getX();
        this.y = base.getY();
        this.z = base.getZ();
    }

    public World bukkitWorld() { return Bukkit.getWorld(world); }

    /** Vrai si le bloc fait partie de la colonne (hauteur donnée). */
    public boolean contains(Block b, int height) {
        return b.getX() == x && b.getZ() == z && b.getY() >= y && b.getY() < y + height && b.getWorld().getName().equals(world);
    }
}
