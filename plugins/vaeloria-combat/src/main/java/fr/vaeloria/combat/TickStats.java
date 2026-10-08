package fr.vaeloria.combat;

import java.util.Arrays;

/** Fenêtre glissante des durées de tick (ms). Ajout en O(1) à chaque tick ; les agrégats ne sont calculés qu'à la demande. */
public final class TickStats {
    private final double[] ring;
    private int next;
    private int size;

    public TickStats(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity");
        this.ring = new double[capacity];
    }

    public synchronized void add(double ms) {
        ring[next] = ms;
        next = (next + 1) % ring.length;
        if (size < ring.length) size++;
    }

    public synchronized int size() {
        return size;
    }

    public synchronized double average() {
        if (size == 0) return 0;
        double sum = 0;
        for (int i = 0; i < size; i++) sum += ring[i];
        return sum / size;
    }

    public synchronized double max() {
        double m = 0;
        for (int i = 0; i < size; i++) m = Math.max(m, ring[i]);
        return m;
    }

    /** Percentile (0..100) par la méthode du rang le plus proche. */
    public synchronized double percentile(double p) {
        if (size == 0) return 0;
        double[] copy = Arrays.copyOf(ring, size);
        Arrays.sort(copy);
        int rank = (int) Math.ceil(p / 100.0 * size);
        return copy[Math.max(0, Math.min(size - 1, rank - 1))];
    }
}
