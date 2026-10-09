package fr.vaeloria.fakeplayers.brain;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.LinkedHashSet;

/**
 * Mémoire des phrases déjà dites (empreinte 64 bits du contenu normalisé), conservée entre les redémarrages
 * (fichier seen.dat). Une phrase dont l'empreinte est connue ne ressort plus, tant qu'elle reste dans la mémoire
 * (les plus anciennes sont oubliées au-delà de la capacité).
 */
public final class SeenTexts {
    private final LinkedHashSet<Long> seen = new LinkedHashSet<>();
    private final int capacity;

    public SeenTexts(int capacity) {
        this.capacity = Math.max(1000, capacity);
    }

    /** Empreinte FNV-1a 64 bits du texte normalisé (minuscules, sans accents ni ponctuation). */
    public static long fingerprint(String text) {
        long h = 0xcbf29ce484222325L;
        for (char c : Text.normalize(text).toCharArray()) {
            h ^= c;
            h *= 0x100000001b3L;
        }
        return h;
    }

    public synchronized boolean contains(String text) {
        return seen.contains(fingerprint(text));
    }

    public synchronized void add(String text) {
        long f = fingerprint(text);
        seen.remove(f);
        seen.add(f);
        while (seen.size() > capacity) {
            Iterator<Long> it = seen.iterator();
            it.next();
            it.remove();
        }
    }

    public synchronized int size() { return seen.size(); }

    public synchronized void save(Path file) throws IOException {
        Files.createDirectories(file.getParent());
        Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
        try (DataOutputStream out = new DataOutputStream(new java.io.BufferedOutputStream(Files.newOutputStream(tmp)))) {
            out.writeInt(seen.size());
            for (long f : seen) out.writeLong(f);
        }
        Files.move(tmp, file, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
    }

    public synchronized void load(Path file) throws IOException {
        if (!Files.exists(file)) return;
        try (DataInputStream in = new DataInputStream(new java.io.BufferedInputStream(Files.newInputStream(file)))) {
            int n = in.readInt();
            for (int i = 0; i < n; i++) seen.add(in.readLong());
        }
        while (seen.size() > capacity) {
            Iterator<Long> it = seen.iterator();
            it.next();
            it.remove();
        }
    }
}
