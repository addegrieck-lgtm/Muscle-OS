package fr.vaeloria.fakeplayers;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.configuration.file.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.logging.Logger;

/**
 * Réserve de skins variés pour les faux joueurs, tirés de la galerie publique de MineSkin (skins envoyés par des
 * joueurs, signés par Mojang donc affichés par le client, et liés à aucun vrai compte). Constituée petit à petit en
 * arrière-plan et gardée dans skin-pool.yml. Chaque pseudo reçoit toujours le même skin, jamais celui d'un autre
 * faux joueur connecté.
 */
final class SkinPool {
    private static final String API = "https://api.mineskin.org/v2/skins";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final File file;
    private final Logger logger;
    private final HttpClient http = HttpClient.newBuilder().proxy(java.net.ProxySelector.getDefault())
            .connectTimeout(TIMEOUT).build();
    private final List<FakePlayer.Skin> skins = new ArrayList<>();
    private final Set<String> ids = new java.util.LinkedHashSet<>(); // même ordre que skins
    private volatile boolean filling;

    SkinPool(File file, Logger logger) {
        this.file = file;
        this.logger = logger;
        load();
    }

    synchronized int size() { return skins.size(); }

    /**
     * Skin d'un pseudo : position fixe dans la réserve (dérivée du pseudo), en sautant ceux déjà portés.
     * @param worn signatures des skins portés par les faux joueurs connectés
     */
    synchronized FakePlayer.Skin pick(String name, Set<String> worn) {
        if (skins.isEmpty()) return null;
        int start = Math.floorMod(name.toLowerCase(Locale.ROOT).hashCode() * 0x9E3779B1, skins.size());
        for (int i = 0; i < skins.size(); i++) {
            FakePlayer.Skin s = skins.get((start + i) % skins.size());
            if (!worn.contains(s.signature())) return s;
        }
        return skins.get(start); // plus de faux joueurs que de skins : un doublon est inévitable
    }

    /**
     * Complète la réserve jusqu'à {@code target} skins, en arrière-plan (thread fourni par l'appelant), à un rythme
     * raisonnable pour l'API publique (une requête toutes les 400 ms, pause d'une minute si elle sature).
     */
    void fill(int target, String apiKey) {
        if (filling || size() >= target) return;
        filling = true;
        int added = 0;
        try {
            String after = null;
            for (int page = 0; page < 60 && size() < target; page++) {
                JsonObject list = get(API + "?size=48" + (after == null ? "" : "&after=" + after), apiKey);
                if (list == null || !list.has("skins")) break;
                JsonArray entries = list.getAsJsonArray("skins");
                if (entries.isEmpty()) break;
                for (JsonElement e : entries) {
                    if (size() >= target) break;
                    String uuid = e.getAsJsonObject().get("uuid").getAsString();
                    if (ids.contains(uuid)) continue;
                    Thread.sleep(400);
                    JsonObject detail = get(API + "/" + uuid, apiKey);
                    FakePlayer.Skin skin = detail == null ? null : texture(detail);
                    if (skin == null) continue;
                    synchronized (this) {
                        ids.add(uuid);
                        skins.add(skin);
                    }
                    added++;
                }
                JsonObject next = list.has("pagination") ? list.getAsJsonObject("pagination").getAsJsonObject("next") : null;
                after = next != null && next.has("after") ? next.get("after").getAsString() : null;
                if (after == null) break;
                if (added > 0 && page % 2 == 1) save();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            logger.fine("Réserve de skins interrompue : " + e.getMessage());
        } finally {
            filling = false;
            if (added > 0) {
                save();
                logger.info("Réserve de skins : " + size() + " skins (+" + added + ").");
            }
        }
    }

    private JsonObject get(String url, String apiKey) throws Exception {
        for (int attempt = 0; attempt < 3; attempt++) {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT)
                    .header("User-Agent", "VaeloriaFakePlayers/0.1").GET();
            if (apiKey != null && !apiKey.isBlank()) b.header("Authorization", "Bearer " + apiKey);
            HttpResponse<String> r = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() == 429) { Thread.sleep(60_000); continue; }
            if (r.statusCode() != 200) return null;
            JsonElement json = JsonParser.parseString(r.body());
            return json.isJsonObject() ? json.getAsJsonObject() : null;
        }
        return null;
    }

    private static FakePlayer.Skin texture(JsonObject detail) {
        if (!detail.has("skin")) return null;
        JsonObject skin = detail.getAsJsonObject("skin");
        if (!skin.has("texture")) return null;
        JsonObject data = skin.getAsJsonObject("texture").getAsJsonObject("data");
        if (data == null || !data.has("value") || !data.has("signature")) return null;
        return new FakePlayer.Skin(data.get("value").getAsString(), data.get("signature").getAsString());
    }

    private synchronized void load() {
        if (!file.exists()) return;
        YamlConfiguration yaml = YamlConfiguration.loadConfiguration(file);
        for (Map<?, ?> m : yaml.getMapList("skins")) {
            Object id = m.get("id"), value = m.get("value"), signature = m.get("signature");
            if (value == null || signature == null) continue;
            skins.add(new FakePlayer.Skin(value.toString(), signature.toString()));
            if (id != null) ids.add(id.toString());
        }
    }

    private void save() {
        YamlConfiguration yaml = new YamlConfiguration();
        List<Map<String, String>> out = new ArrayList<>();
        synchronized (this) {
            List<String> idList = new ArrayList<>(ids);
            for (int i = 0; i < skins.size(); i++) {
                FakePlayer.Skin s = skins.get(i);
                out.add(Map.of("id", i < idList.size() ? idList.get(i) : "", "value", s.value(), "signature", s.signature()));
            }
        }
        yaml.set("skins", out);
        try {
            yaml.save(file);
        } catch (IOException e) {
            logger.warning("Impossible d'enregistrer skin-pool.yml : " + e.getMessage());
        }
    }
}
