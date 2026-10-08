package fr.vaeloria.vote;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/** Un fichier JSON par joueur, écrit de façon atomique (fichier temporaire puis renommage). */
final class Storage {
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();
    private final Path players;
    private final Path locks;

    Storage(Path dataFolder) throws IOException {
        this.players = dataFolder.resolve("players");
        this.locks = dataFolder.resolve("ip-locks.json");
        Files.createDirectories(players);
    }

    PlayerVotes load(UUID uuid) throws IOException {
        Path f = players.resolve(uuid + ".json");
        if (!Files.exists(f)) return new PlayerVotes();
        return Codec.readVotes(JsonParser.parseString(Files.readString(f, StandardCharsets.UTF_8)).getAsJsonObject());
    }

    /** À appeler sur le thread principal : renvoie le texte à écrire (l'écriture peut partir en asynchrone). */
    static String serialize(PlayerVotes votes) {
        return GSON.toJson(Codec.write(votes));
    }

    static String serialize(IpLocks l) {
        return GSON.toJson(Codec.write(l));
    }

    void write(UUID uuid, String json) throws IOException {
        atomicWrite(players.resolve(uuid + ".json"), json);
    }

    IpLocks loadLocks() throws IOException {
        if (!Files.exists(locks)) return new IpLocks();
        JsonObject o = JsonParser.parseString(Files.readString(locks, StandardCharsets.UTF_8)).getAsJsonObject();
        return Codec.readLocks(o);
    }

    void writeLocks(String json) throws IOException {
        atomicWrite(locks, json);
    }

    private static synchronized void atomicWrite(Path target, String content) throws IOException {
        Path tmp = target.resolveSibling(target.getFileName() + ".tmp");
        Files.writeString(tmp, content, StandardCharsets.UTF_8);
        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
    }
}
