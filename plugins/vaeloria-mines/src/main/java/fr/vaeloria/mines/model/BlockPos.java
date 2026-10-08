package fr.vaeloria.mines.model;

public record BlockPos(String world, int x, int y, int z) {
    @Override
    public String toString() {
        return x + " " + y + " " + z;
    }
}
