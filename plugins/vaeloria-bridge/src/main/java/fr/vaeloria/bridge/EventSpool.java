package fr.vaeloria.bridge;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.stream.Stream;

/**
 * File d'événements à destination de l'API.
 * - En mémoire pendant le fonctionnement normal.
 * - Si l'API est injoignable, le lot est écrit sur disque (spool/) et renvoyé plus tard.
 * - Chaque événement a un id UUID : un renvoi après une réponse perdue est dédupliqué par l'API.
 * Aucune perte en cas de panne de l'API ou de redémarrage du serveur.
 */
public final class EventSpool {
    public interface Sender {
        /** @return true si l'API a accepté le lot (2xx). */
        boolean send(String json) throws Exception;
    }

    private final ConcurrentLinkedQueue<JsonObject> queue = new ConcurrentLinkedQueue<>();
    private final Path dir;
    private final int batchSize;

    public EventSpool(Path dir, int batchSize) throws IOException {
        this.dir = Files.createDirectories(dir);
        this.batchSize = batchSize;
    }

    public void add(JsonObject event) {
        queue.add(event);
    }

    public int pendingInMemory() {
        return queue.size();
    }

    public long pendingOnDisk() throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.toString().endsWith(".json")).count();
        }
    }

    private static String wrap(List<JsonObject> events) {
        JsonArray arr = new JsonArray();
        events.forEach(arr::add);
        JsonObject root = new JsonObject();
        root.add("events", arr);
        return root.toString();
    }

    /** Envoie d'abord les lots en attente sur disque (ordre chronologique), puis la mémoire. */
    public synchronized void flush(Sender sender) throws IOException {
        List<Path> files;
        try (Stream<Path> s = Files.list(dir)) {
            files = s.filter(p -> p.toString().endsWith(".json")).sorted().toList();
        }
        for (Path f : files) {
            try {
                if (!sender.send(Files.readString(f, StandardCharsets.UTF_8))) return; // API toujours indisponible
                Files.delete(f);
            } catch (Exception e) {
                return;
            }
        }
        while (!queue.isEmpty()) {
            List<JsonObject> batch = new ArrayList<>(batchSize);
            JsonObject e;
            while (batch.size() < batchSize && (e = queue.poll()) != null) batch.add(e);
            String json = wrap(batch);
            boolean ok;
            try {
                ok = sender.send(json);
            } catch (Exception ex) {
                ok = false;
            }
            if (!ok) {
                persist(json);
                // Le reste de la mémoire part aussi sur disque : l'ordre est conservé.
                List<JsonObject> rest = new ArrayList<>();
                while ((e = queue.poll()) != null) rest.add(e);
                if (!rest.isEmpty()) persist(wrap(rest));
                return;
            }
        }
    }

    /** Arrêt du serveur : tout ce qui reste en mémoire est écrit sur disque. */
    public synchronized void persistAll() throws IOException {
        List<JsonObject> rest = new ArrayList<>();
        JsonObject e;
        while ((e = queue.poll()) != null) rest.add(e);
        if (!rest.isEmpty()) persist(wrap(rest));
    }

    private void persist(String json) throws IOException {
        Path f = dir.resolve(System.currentTimeMillis() + "-" + System.nanoTime() + ".json");
        Files.writeString(f, json, StandardCharsets.UTF_8);
    }

    static int count(String json) {
        return JsonParser.parseString(json).getAsJsonObject().getAsJsonArray("events").size();
    }
}
