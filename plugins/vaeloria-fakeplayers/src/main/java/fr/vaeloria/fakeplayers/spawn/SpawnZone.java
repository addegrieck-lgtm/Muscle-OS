package fr.vaeloria.fakeplayers.spawn;

import java.util.List;
import java.util.Random;

/**
 * Plan du spawn dans son propre repère (celui du schematic VÆLORIA : x/z = 0 au centre de l'arbre, sol à y = 0,
 * nord = -Z), placé dans le monde par une ancre (bloc de sol au centre de l'arbre) et une rotation.
 */
public final class SpawnZone {
    /** Lieu fréquenté : centre (repère du spawn), rayon et poids. */
    public record Point(String name, double x, double z, double radius, double weight) {}

    private final double ax, ay, az;
    private final int rotation;
    private final List<Point> points;
    private final Point arrival;
    private final Point exit;
    private final List<Point> afkPoints;

    /**
     * @param rotation rotation du collage, en degrés dans le sens horaire vu du dessus (0, 90, 180 ou 270)
     */
    public SpawnZone(double ax, double ay, double az, int rotation, List<Point> points, Point arrival, Point exit) {
        this(ax, ay, az, rotation, points, arrival, exit, List.of());
    }

    /** @param afkPoints zones AFK (vide = un bot devient AFK là où il s'arrête) */
    public SpawnZone(double ax, double ay, double az, int rotation, List<Point> points, Point arrival, Point exit,
                     List<Point> afkPoints) {
        this.ax = ax;
        this.ay = ay;
        this.az = az;
        this.rotation = ((rotation % 360) + 360) % 360;
        this.points = List.copyOf(points);
        this.arrival = arrival;
        this.exit = exit;
        this.afkPoints = List.copyOf(afkPoints);
    }

    public List<Point> afkPoints() { return afkPoints; }

    /** Zone AFK au hasard selon les poids, ou null s'il n'y en a pas. */
    public Point pickAfk(Random random) {
        return afkPoints.isEmpty() ? null : pick(afkPoints, random);
    }

    /** Coordonnées dans le repère du spawn {x, z} d'une position du monde (inverse de {@link #toWorld}). */
    public double[] toLocal(double wx, double wz) {
        double dx = wx - ax, dz = wz - az;
        return switch (rotation) {
            case 90 -> new double[]{dz, -dx};
            case 180 -> new double[]{-dx, -dz};
            case 270 -> new double[]{-dz, dx};
            default -> new double[]{dx, dz};
        };
    }

    public List<Point> points() { return points; }
    public Point arrival() { return arrival; }
    public Point exit() { return exit; }
    /** Hauteur des pieds au niveau du sol du spawn. */
    public double floorFeet() { return ay + 1; }

    /** Coordonnées monde {x, z} d'un point du repère du spawn. */
    public double[] toWorld(double x, double z) {
        return switch (rotation) {
            case 90 -> new double[]{ax - z, az + x};
            case 180 -> new double[]{ax - x, az - z};
            case 270 -> new double[]{ax + z, az - x};
            default -> new double[]{ax + x, az + z};
        };
    }

    /** Point au hasard dans un lieu (coordonnées monde), réparti uniformément dans le disque. */
    public double[] randomIn(Point p, Random random) {
        double a = random.nextDouble() * Math.PI * 2, r = p.radius() * Math.sqrt(random.nextDouble());
        return toWorld(p.x() + Math.cos(a) * r, p.z() + Math.sin(a) * r);
    }

    /** Lieu au hasard selon les poids. */
    public Point pick(Random random) {
        return pick(points, random);
    }

    private static Point pick(List<Point> points, Random random) {
        double total = 0;
        for (Point p : points) total += p.weight();
        double roll = random.nextDouble() * total;
        for (Point p : points) {
            roll -= p.weight();
            if (roll < 0) return p;
        }
        return points.get(points.size() - 1);
    }

    /** Ancre déduite du point d'apparition (le bloc sous les pieds, lodestone du schematic en z = 62). */
    public static double[] anchorFromSpawnPoint(double feetX, double feetY, double feetZ, int rotation, double spawnZ) {
        SpawnZone probe = new SpawnZone(0, 0, 0, rotation, List.of(), null, null);
        double[] offset = probe.toWorld(0, spawnZ);
        return new double[]{Math.floor(feetX) - offset[0], Math.floor(feetY) - 1, Math.floor(feetZ) - offset[1]};
    }
}
