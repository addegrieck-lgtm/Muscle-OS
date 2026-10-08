package fr.vaeloria.factions.storage;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import fr.vaeloria.factions.model.FPlayer;
import fr.vaeloria.factions.model.Faction;

import java.io.IOException;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Persistance JSON. Écriture atomique (fichier temporaire puis renommage) et copie .bak de la version précédente :
 * un crash pendant la sauvegarde ne peut pas corrompre les données.
 */
public final class Store {
    private static final Type FACTIONS = new TypeToken<List<Faction>>() {}.getType();
    private static final Type PLAYERS = new TypeToken<List<FPlayer>>() {}.getType();
    private static final Type STRING_MAP = new TypeToken<Map<String, String>>() {}.getType();

    private final Gson gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
    private final Path dir;

    public Store(Path dir) throws IOException {
        this.dir = dir;
        Files.createDirectories(dir);
    }

    /** Données globales : période de grâce et usure des blocs renforcés. */
    public static final class State {
        public long graceUntil;
        public Map<String, Integer> blockDamage = new HashMap<>();
        /** Guerres officielles en cours (préparation ou combat). */
        public List<fr.vaeloria.factions.model.War> wars = new ArrayList<>();
        /** Fin de la dernière guerre entre deux factions (WarRules.pairKey → epoch ms). */
        public Map<String, Long> warCooldowns = new HashMap<>();
        /** Totems définis par le staff (nom en minuscules → emplacement). */
        public Map<String, fr.vaeloria.factions.model.TotemDef> totems = new java.util.LinkedHashMap<>();
        /** Avant-postes et KOTH (nom en minuscules → zone). */
        public Map<String, fr.vaeloria.factions.model.Zone> zones = new java.util.LinkedHashMap<>();
        /** Missions du jour : date (AAAA-MM-JJ), missions tirées, progression et missions accomplies par faction. */
        public String missionsDay;
        public List<String> missionsToday = new ArrayList<>();
        public Map<String, Map<String, Integer>> missionProgress = new HashMap<>();
        public Map<String, List<String>> missionsCompleted = new HashMap<>();
    }

    public List<Faction> loadFactions() throws IOException {
        List<Faction> l = read("factions.json", FACTIONS);
        return l == null ? new ArrayList<>() : l;
    }

    public List<FPlayer> loadPlayers() throws IOException {
        List<FPlayer> l = read("players.json", PLAYERS);
        return l == null ? new ArrayList<>() : l;
    }

    public Map<String, String> loadClaims() throws IOException {
        Map<String, String> m = read("claims.json", STRING_MAP);
        return m == null ? new HashMap<>() : m;
    }

    public State loadState() throws IOException {
        State s = read("state.json", State.class);
        if (s == null) s = new State();
        if (s.blockDamage == null) s.blockDamage = new HashMap<>();
        if (s.wars == null) s.wars = new ArrayList<>();
        if (s.warCooldowns == null) s.warCooldowns = new HashMap<>();
        if (s.totems == null) s.totems = new java.util.LinkedHashMap<>();
        if (s.zones == null) s.zones = new java.util.LinkedHashMap<>();
        if (s.missionsToday == null) s.missionsToday = new ArrayList<>();
        if (s.missionProgress == null) s.missionProgress = new HashMap<>();
        if (s.missionsCompleted == null) s.missionsCompleted = new HashMap<>();
        for (fr.vaeloria.factions.model.War w : s.wars) if (w.participants == null) w.participants = new java.util.HashSet<>();
        return s;
    }

    /** Sérialise sur le thread appelant (données cohérentes), à écrire ensuite avec {@link Snapshot#write()}. */
    public Snapshot snapshot(List<Faction> factions, List<FPlayer> players, Map<String, String> claims, State state) {
        return new Snapshot(Map.of(
                "factions.json", gson.toJson(factions, FACTIONS),
                "players.json", gson.toJson(players, PLAYERS),
                "claims.json", gson.toJson(claims, STRING_MAP),
                "state.json", gson.toJson(state)));
    }

    public final class Snapshot {
        private final Map<String, String> files;

        private Snapshot(Map<String, String> files) { this.files = files; }

        public synchronized void write() throws IOException {
            synchronized (Store.this) {
                for (Map.Entry<String, String> e : files.entrySet()) {
                    Path target = dir.resolve(e.getKey());
                    Path tmp = dir.resolve(e.getKey() + ".tmp");
                    Files.writeString(tmp, e.getValue(), StandardCharsets.UTF_8);
                    if (Files.exists(target)) Files.copy(target, dir.resolve(e.getKey() + ".bak"), StandardCopyOption.REPLACE_EXISTING);
                    try {
                        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                    } catch (java.nio.file.AtomicMoveNotSupportedException ex) {
                        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                }
            }
        }
    }

    private <T> T read(String file, Type type) throws IOException {
        Path p = dir.resolve(file);
        if (!Files.exists(p)) return null;
        return gson.fromJson(Files.readString(p, StandardCharsets.UTF_8), type);
    }
}
