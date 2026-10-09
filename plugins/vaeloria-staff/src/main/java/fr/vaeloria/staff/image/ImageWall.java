package fr.vaeloria.staff.image;

import org.bukkit.block.BlockFace;

import java.util.ArrayList;
import java.util.List;

/**
 * Image posée sur un mur de cadres : {@code cols × rows} cartes de 128×128 pixels.
 * {@code origin} est le bloc du mur en bas à gauche (vu de face), {@code face} la face du mur où sont les cadres.
 */
public final class ImageWall {
    private final String id;
    private final String source;
    private final String world;
    private final int x, y, z;
    private final BlockFace face;
    private final int cols, rows;
    private final List<Integer> maps = new ArrayList<>();

    public ImageWall(String id, String source, String world, int x, int y, int z, BlockFace face, int cols, int rows) {
        this.id = id;
        this.source = source;
        this.world = world;
        this.x = x;
        this.y = y;
        this.z = z;
        this.face = face;
        this.cols = cols;
        this.rows = rows;
    }

    public String id() { return id; }
    public String source() { return source; }
    public String world() { return world; }
    public int x() { return x; }
    public int y() { return y; }
    public int z() { return z; }
    public BlockFace face() { return face; }
    public int cols() { return cols; }
    public int rows() { return rows; }
    /** Identifiants des cartes, {@code maps[row * cols + col]}. */
    public List<Integer> maps() { return maps; }

    /** Décalage horizontal vers la droite d'un joueur qui regarde le mur de face. */
    public static int[] right(BlockFace face) {
        BlockFace look = face.getOppositeFace();
        return new int[] {-look.getModZ(), look.getModX()};
    }

    /** Bloc support de la tuile (col, row), row 0 = en haut : {x, y, z}. */
    public int[] support(int col, int row) {
        int[] r = right(face);
        return new int[] {x + r[0] * col, y + (rows - 1 - row), z + r[1] * col};
    }
}
