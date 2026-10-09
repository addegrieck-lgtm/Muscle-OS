package fr.vaeloria.fakeplayers.spawn;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.*;

class WalkerTest {
    /** Spawn simplifié comme le schematic : anneau (rayon 28 à 80) autour du vide, îlot central, deux pontons. */
    static final Terrain SPAWN = (x, fromY, z) -> {
        double r = Math.hypot(x + 0.5, z + 0.5);
        boolean ring = r >= 28 && r <= 80;
        boolean islet = r <= 10;
        boolean bridge = Math.abs(x) <= 2 && Math.abs(z) >= 9 && Math.abs(z) <= 29;
        boolean wall = x == 57 && Math.abs(z) <= 3; // un obstacle dans le marché
        if (wall) return Double.NaN;
        double feet = islet ? 2 : (ring || bridge) ? 1 : Double.NaN;
        if (Double.isNaN(feet) || feet - fromY > 1.01 || fromY - feet > 3) return Double.NaN;
        return feet;
    };

    static boolean onGround(double x, double z) {
        return !Double.isNaN(SPAWN.feet((int) Math.floor(x), 1, (int) Math.floor(z)));
    }

    @Test
    void neverWalksIntoTheVoid() {
        SpawnZone zone = new SpawnZone(0, 0, 0, 0, List.of(
                new SpawnZone.Point("place", 0, 46, 12, 5), new SpawnZone.Point("marche", 57, 0, 9, 3),
                new SpawnZone.Point("arene", -57, 0, 7, 2), new SpawnZone.Point("ilot", 0, -7, 2.5, 1)),
                new SpawnZone.Point("apparition", 0, 62, 1.5, 0), null);
        Random r = new Random(4);
        double x = 0.5, y = 1, z = 62.5;
        int arrived = 0, steps = 0, side = 1;
        for (int trip = 0; trip < 60; trip++) {
            double[] t = zone.randomIn(zone.pick(r), r);
            if (!onGround(t[0], t[1])) continue;
            for (int i = 0; i < 2000; i++) {
                if (Math.hypot(t[0] - x, t[1] - z) < 0.6) { arrived++; break; }
                Walker.Step s = Walker.step(SPAWN, x, y, z, t[0], t[1], 0.2, side);
                if (s == null) break; // bloqué : le vrai bot choisit une autre cible
                x = s.x(); y = s.y(); z = s.z(); side = s.side();
                steps++;
                assertTrue(onGround(x, z), "dans le vide en " + x + " " + z);
            }
        }
        assertTrue(steps > 3000, "trop peu de déplacements : " + steps);
        assertTrue(arrived > 20, "arrivé seulement " + arrived + " fois");
    }

    @Test
    void walksAroundAnObstacle() {
        double x = 50.5, y = 1, z = 0.5;
        int side = 1;
        for (int i = 0; i < 300 && Math.hypot(64.5 - x, 0.5 - z) > 0.6; i++) {
            Walker.Step s = Walker.step(SPAWN, x, y, z, 64.5, 0.5, 0.2, side);
            assertNotNull(s, "bloqué devant le mur en " + x + " " + z);
            x = s.x(); y = s.y(); z = s.z(); side = s.side();
        }
        assertEquals(64.5, x, 0.7);
    }

    @Test
    void stepsUpOntoTheIsletFromTheBridge() {
        double x = 0.5, y = 1, z = 20.5;
        for (int i = 0; i < 200 && z > -5; i++) {
            Walker.Step s = Walker.step(SPAWN, x, y, z, 0.5, -6.5, 0.2);
            assertNotNull(s);
            x = s.x(); y = s.y(); z = s.z();
        }
        assertEquals(2, y, 1e-9);
    }

    @Test
    void rotationAndAnchorFromSpawnPoint() {
        SpawnZone z90 = new SpawnZone(100, 64, 200, 90, List.of(), null, null);
        assertArrayEquals(new double[]{100 - 62, 200}, z90.toWorld(0, 62), 1e-9); // le sud tourne vers l'ouest
        double[] a = SpawnZone.anchorFromSpawnPoint(10.7, 65.0, 262.3, 0, 62);
        assertArrayEquals(new double[]{10, 64, 200}, a, 1e-9);
        assertEquals(180f, Math.abs(Walker.yaw(0, -1)), 1e-4); // regarder vers le nord
        for (int rot : new int[]{0, 90, 180, 270}) { // toLocal est bien l'inverse de toWorld
            SpawnZone zr = new SpawnZone(100, 64, 200, rot, List.of(), null, null);
            double[] w = zr.toWorld(12.5, -7);
            assertArrayEquals(new double[]{12.5, -7}, zr.toLocal(w[0], w[1]), 1e-9, "rotation " + rot);
        }
    }
}
