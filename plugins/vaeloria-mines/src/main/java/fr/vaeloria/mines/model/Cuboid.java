package fr.vaeloria.mines.model;

/** Zone rectangulaire d'une mine (bornes incluses), sérialisée « monde;x1;y1;z1;x2;y2;z2 ». */
public record Cuboid(String world, int minX, int minY, int minZ, int maxX, int maxY, int maxZ) {
    public Cuboid {
        if (world == null || world.isEmpty()) throw new IllegalArgumentException("Monde manquant");
        if (minX > maxX || minY > maxY || minZ > maxZ) throw new IllegalArgumentException("Bornes inversées");
    }

    /** Zone entre deux coins quelconques. */
    public static Cuboid of(BlockPos a, BlockPos b) {
        if (!a.world().equals(b.world())) throw new IllegalArgumentException("Les deux coins doivent être dans le même monde");
        return new Cuboid(a.world(), Math.min(a.x(), b.x()), Math.min(a.y(), b.y()), Math.min(a.z(), b.z()),
                Math.max(a.x(), b.x()), Math.max(a.y(), b.y()), Math.max(a.z(), b.z()));
    }

    public int sizeX() { return maxX - minX + 1; }
    public int sizeY() { return maxY - minY + 1; }
    public int sizeZ() { return maxZ - minZ + 1; }

    public long volume() {
        return (long) sizeX() * sizeY() * sizeZ();
    }

    public boolean contains(String w, int x, int y, int z) {
        return contains(w, x, y, z, 0);
    }

    /** Contenu dans la zone agrandie de {@code margin} blocs de chaque côté. */
    public boolean contains(String w, int x, int y, int z, int margin) {
        return world.equals(w)
                && x >= minX - margin && x <= maxX + margin
                && y >= minY - margin && y <= maxY + margin
                && z >= minZ - margin && z <= maxZ + margin;
    }

    /** Coordonnées du n-ième bloc, de bas en haut (couche par couche) : la mine se remplit depuis le fond. */
    public BlockPos at(long index) {
        long layer = (long) sizeX() * sizeZ();
        int y = (int) (index / layer);
        long rest = index % layer;
        return new BlockPos(world, minX + (int) (rest % sizeX()), minY + y, minZ + (int) (rest / sizeX()));
    }

    public String serialize() {
        return world + ";" + minX + ";" + minY + ";" + minZ + ";" + maxX + ";" + maxY + ";" + maxZ;
    }

    public static Cuboid parse(String s) {
        String[] p = s.split(";");
        if (p.length != 7) throw new IllegalArgumentException("Zone invalide : " + s);
        return Cuboid.of(new BlockPos(p[0], Integer.parseInt(p[1]), Integer.parseInt(p[2]), Integer.parseInt(p[3])),
                new BlockPos(p[0], Integer.parseInt(p[4]), Integer.parseInt(p[5]), Integer.parseInt(p[6])));
    }

    @Override
    public String toString() {
        return minX + " " + minY + " " + minZ + " → " + maxX + " " + maxY + " " + maxZ + " (" + world + ")";
    }
}
