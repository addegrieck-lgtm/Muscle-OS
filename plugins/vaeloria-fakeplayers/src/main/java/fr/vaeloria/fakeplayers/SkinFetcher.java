package fr.vaeloria.fakeplayers;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * Récupère le skin signé d'un compte Mojang par son pseudo, directement auprès des API Mojang
 * (sans passer par Paper, qui écrit « Couldn't find profile » dans la console pour chaque pseudo inexistant).
 * Les résultats, y compris « pas de compte », sont gardés en cache. Appels bloquants : hors du thread principal.
 */
final class SkinFetcher {
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient http = HttpClient.newBuilder()
            .proxy(java.net.ProxySelector.getDefault()) // respecte un éventuel proxy configuré pour Java
            .connectTimeout(TIMEOUT).build();
    private final Map<String, Optional<FakePlayer.Skin>> cache = new ConcurrentHashMap<>();
    private final Logger logger;

    SkinFetcher(Logger logger) {
        this.logger = logger;
    }

    /** Skin du compte, ou null s'il n'existe pas (ou si Mojang ne répond pas). */
    FakePlayer.Skin fetch(String name) {
        if (!NamePool.isValid(name)) return null;
        String key = name.toLowerCase(Locale.ROOT);
        Optional<FakePlayer.Skin> cached = cache.get(key);
        if (cached != null) return cached.orElse(null);
        try {
            JsonObject account = get("https://api.mojang.com/users/profiles/minecraft/" + name);
            if (account == null || !account.has("id")) {
                cache.put(key, Optional.empty());
                return null;
            }
            JsonObject profile = get("https://sessionserver.mojang.com/session/minecraft/profile/"
                    + account.get("id").getAsString() + "?unsigned=false");
            FakePlayer.Skin skin = profile == null ? null : textures(profile);
            cache.put(key, Optional.ofNullable(skin));
            return skin;
        } catch (RateLimited e) {
            logger.fine("API Mojang saturée, skin de " + name + " ignoré pour l'instant");
            return null; // pas mis en cache : on réessaiera plus tard
        } catch (Exception e) {
            logger.fine("Skin introuvable pour " + name + " : " + e.getMessage());
            return null;
        }
    }

    private JsonObject get(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).GET().build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 429) throw new RateLimited();
        if (response.statusCode() != 200 || response.body().isBlank()) return null; // 204/404 : pas de compte
        JsonElement json = JsonParser.parseString(response.body());
        return json.isJsonObject() ? json.getAsJsonObject() : null;
    }

    private static FakePlayer.Skin textures(JsonObject profile) {
        if (!profile.has("properties")) return null;
        for (JsonElement e : profile.getAsJsonArray("properties")) {
            JsonObject p = e.getAsJsonObject();
            if ("textures".equals(p.get("name").getAsString()) && p.has("signature")) {
                return new FakePlayer.Skin(p.get("value").getAsString(), p.get("signature").getAsString());
            }
        }
        return null;
    }

    private static final class RateLimited extends Exception {}
}
