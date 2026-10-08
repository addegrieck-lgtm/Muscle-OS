package fr.vaeloria.factions.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.rules.WebhookRules;
import fr.vaeloria.factions.util.Settings;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;
import java.util.logging.Logger;

/**
 * Alertes Discord par webhook : chaque faction branche le salon de son serveur Discord (/f discord), et le staff
 * peut ajouter un webhook global pour les annonces publiques (guerres, grands pillages).
 * Envoi asynchrone, jamais bloquant pour le serveur ; limité à un message par seconde et par webhook.
 */
public final class DiscordService {
    public enum Event { RAID, OVERCLAIM, WAR, MEMBERS, COMBATLOG }

    private static final int RED = 0xD21F2F, GOLD = 0xFACC15, GREEN = 0x4ADE80, GREY = 0xA9AEB8;

    private final Settings settings;
    private final Logger log;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    /** File par webhook : les messages partent dans l'ordre, espacés, sans jamais être jetés (sauf file saturée). */
    private final Map<String, java.util.concurrent.CompletableFuture<Void>> queues = new ConcurrentHashMap<>();
    private final Map<String, java.util.concurrent.atomic.AtomicInteger> pending = new ConcurrentHashMap<>();
    private static final int MAX_PENDING = 20;
    private static final java.util.concurrent.Executor SPACING =
            java.util.concurrent.CompletableFuture.delayedExecutor(400, java.util.concurrent.TimeUnit.MILLISECONDS);
    private final Map<String, Long> blockedUntil = new ConcurrentHashMap<>();

    public DiscordService(Settings settings, Logger log) {
        this.settings = settings;
        this.log = log;
    }

    private boolean wants(Event e) {
        return settings.discordEnabled && settings.discordEvents.contains(e.name());
    }

    public boolean validUrl(String url) {
        return WebhookRules.valid(url, settings.discordUrlPattern);
    }

    // ── Messages prêts à l'emploi ──

    public void raid(Faction defender, String attacker, int x, int z) {
        if (!wants(Event.RAID)) return;
        send(defender, embed("⚠ Pillage en cours", "**" + esc(attacker) + "** attaque votre base en **" + x + ", " + z + "**.\nConnectez-vous pour défendre !", RED),
                defender.discordPing);
    }

    public void overclaimLost(Faction defender, String attacker, int x, int z) {
        if (!wants(Event.OVERCLAIM)) return;
        send(defender, embed("Territoire perdu", "**" + esc(attacker) + "** a surclaim votre chunk en **" + x + ", " + z + "**. Votre power ne couvre plus vos terres.", RED),
                defender.discordPing);
    }

    public void overclaimWon(Faction attacker, String defender, int x, int z) {
        if (!wants(Event.OVERCLAIM)) return;
        send(attacker, embed("Surclaim réussi", "Chunk **" + x + ", " + z + "** arraché à **" + esc(defender) + "**.", GREEN), false);
    }

    public void member(Faction f, String text) {
        if (!wants(Event.MEMBERS)) return;
        send(f, embed("Membres", esc(text), GREY), false);
    }

    public void combatLog(Faction f, String player) {
        if (!wants(Event.COMBATLOG)) return;
        send(f, embed("Déconnexion en combat", "**" + esc(player) + "** s'est déconnecté en plein combat et a été tué.", GOLD), false);
    }

    /** Guerre : message à chaque camp et, si configuré, au webhook global. */
    public void war(Faction a, Faction b, String title, String text, boolean global) {
        if (!wants(Event.WAR)) return;
        JsonObject e = embed(title, text, GOLD);
        if (a != null) send(a, e, false);
        if (b != null) send(b, e, false);
        if (global) sendGlobal(e);
    }

    public void sendGlobal(JsonObject embed) {
        String url = settings.discordGlobalWebhook;
        if (settings.discordEnabled && url != null && !url.isBlank()) post(url, payload(embed, false), null);
    }

    public void test(Faction f, Consumer<Boolean> done) {
        if (f.discordWebhook == null) {
            done.accept(false);
            return;
        }
        post(f.discordWebhook, payload(embed("VÆLORIA", "Le salon de **" + esc(f.name) + "** est relié : les alertes de pillage arriveront ici.", GREEN), false), done);
    }

    // ── Envoi ──

    private void send(Faction f, JsonObject embed, boolean ping) {
        if (f == null || f.discordWebhook == null) return;
        post(f.discordWebhook, payload(embed, ping), null);
    }

    private static String esc(String s) { return WebhookRules.escape(s); }

    private static JsonObject embed(String title, String description, int color) {
        JsonObject e = new JsonObject();
        e.addProperty("title", title);
        e.addProperty("description", description);
        e.addProperty("color", color);
        e.addProperty("timestamp", Instant.now().toString());
        JsonObject footer = new JsonObject();
        footer.addProperty("text", "VÆLORIA · Factions");
        e.add("footer", footer);
        return e;
    }

    static JsonObject payload(JsonObject embed, boolean ping) {
        JsonObject o = new JsonObject();
        o.addProperty("username", "VÆLORIA");
        if (ping) o.addProperty("content", "@everyone");
        JsonArray embeds = new JsonArray();
        embeds.add(embed);
        o.add("embeds", embeds);
        // Seul @everyone (choisi par la faction) peut notifier ; aucun texte de joueur ne peut mentionner qui que ce soit.
        JsonObject mentions = new JsonObject();
        JsonArray parse = new JsonArray();
        if (ping) parse.add("everyone");
        mentions.add("parse", parse);
        o.add("allowed_mentions", mentions);
        return o;
    }

    private void post(String url, JsonObject body, Consumer<Boolean> done) {
        HttpRequest req;
        try {
            req = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body.toString())).build();
        } catch (IllegalArgumentException e) {
            if (done != null) done.accept(false);
            return;
        }
        var count = pending.computeIfAbsent(url, k -> new java.util.concurrent.atomic.AtomicInteger());
        if (count.incrementAndGet() > MAX_PENDING) {
            count.decrementAndGet();
            if (done != null) done.accept(false);
            return;
        }
        queues.compute(url, (k, tail) -> (tail == null ? java.util.concurrent.CompletableFuture.<Void>completedFuture(null) : tail)
                .thenComposeAsync(x -> deliver(url, req), SPACING)
                .handle((ok, err) -> {
                    count.decrementAndGet();
                    if (done != null) done.accept(err == null && Boolean.TRUE.equals(ok));
                    return null;
                }));
    }

    private java.util.concurrent.CompletableFuture<Boolean> deliver(String url, HttpRequest req) {
        Long blocked = blockedUntil.get(url);
        if (blocked != null && blocked > System.currentTimeMillis()) return java.util.concurrent.CompletableFuture.completedFuture(false);
        return http.sendAsync(req, HttpResponse.BodyHandlers.discarding()).handle((res, err) -> {
            if (err != null) return false;
            int code = res.statusCode();
            if (code == 429) {
                long wait = 5000L;
                try {
                    wait = res.headers().firstValue("retry-after").map(v -> (long) (Double.parseDouble(v) * 1000)).orElse(5000L);
                } catch (NumberFormatException ignored) {
                }
                blockedUntil.put(url, System.currentTimeMillis() + Math.min(wait, 60_000));
            } else if (code == 401 || code == 404) {
                // Webhook supprimé côté Discord : inutile d'insister pendant une heure.
                blockedUntil.put(url, System.currentTimeMillis() + 3_600_000);
                log.fine("Webhook Discord invalide (" + code + ")");
            }
            return code / 100 == 2;
        });
    }
}
