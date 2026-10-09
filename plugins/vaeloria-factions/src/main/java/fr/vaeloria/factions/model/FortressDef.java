package fr.vaeloria.factions.model;

import org.bukkit.Location;

import java.util.ArrayList;
import java.util.List;

/** La Forteresse telle que le staff l'a placée : monde, portes, sommet, enceinte, carte entière, camps et point de sortie. */
public final class FortressDef {
    public String world;
    /** Point d'origine du schéma (centre de la forteresse, au sol) : sert à la téléportation du staff. */
    public Pos origin;
    public List<Gate> gates = new ArrayList<>();
    /** Le haut du donjon : la dernière équipe en vie ici gagne. */
    public Box summit;
    /** L'intérieur de l'enceinte : qui est dehors à la fermeture des portes est éliminé. */
    public Box area;
    /** Toute la carte : constructions, explosions et seaux y sont interdits. */
    public Box arena;
    public List<Pos> camps = new ArrayList<>();
    /** Où l'on renvoie les curieux trouvés dans l'enceinte pendant l'assaut. */
    public Pos lobby;

    public boolean ready() {
        return world != null && summit != null && area != null && !camps.isEmpty();
    }

    /** Pavé de blocs, bornes incluses. */
    public static final class Box {
        public int x1, y1, z1, x2, y2, z2;

        public Box() {}

        public static Box of(int ax, int ay, int az, int bx, int by, int bz) {
            Box b = new Box();
            b.x1 = Math.min(ax, bx); b.y1 = Math.min(ay, by); b.z1 = Math.min(az, bz);
            b.x2 = Math.max(ax, bx); b.y2 = Math.max(ay, by); b.z2 = Math.max(az, bz);
            return b;
        }

        public boolean contains(int x, int y, int z) {
            return x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2;
        }

        public boolean contains(Location l) {
            return contains(l.getBlockX(), l.getBlockY(), l.getBlockZ());
        }

        public long volume() {
            return (long) (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
        }

        @Override
        public String toString() {
            return x1 + ", " + y1 + ", " + z1 + " → " + x2 + ", " + y2 + ", " + z2;
        }
    }

    /** Une herse : ses blocs quand elle est fermée (ex. barreaux de fer) ; ouverte, ce sont des blocs d'air. */
    public static final class Gate {
        public String name;
        public Box box;
        public String block;
    }
}
