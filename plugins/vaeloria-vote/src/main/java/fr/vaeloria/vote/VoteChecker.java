package fr.vaeloria.vote;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/** Interroge l'API d'un site (hors du thread principal). Une erreur réseau = vote non trouvé, jamais accordé. */
final class VoteChecker {
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    CompletableFuture<Boolean> check(VoteSite site, String player, UUID uuid, String ip, int timeoutSeconds) {
        HttpRequest req;
        try {
            req = HttpRequest.newBuilder(URI.create(site.checkRequest(player, uuid, ip)))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("User-Agent", "VaeloriaVote/1.0")
                    .GET().build();
        } catch (IllegalArgumentException e) {
            return CompletableFuture.failedFuture(e);
        }
        return http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .thenApply(res -> res.statusCode() / 100 == 2 && site.accepts(res.body()));
    }
}
