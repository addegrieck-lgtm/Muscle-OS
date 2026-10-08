package fr.vaeloria.vote;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Un site de vote. La vérification par API est facultative : tant que check-url est vide,
 * les votes de ce site n'arrivent que par NuVotifier ou par /votes give.
 */
public record VoteSite(String id, String name, String voteUrl, int cooldownMinutes,
                       String checkUrl, String apiKey, Pattern success, String votifierService) {
    public VoteSite {
        if (cooldownMinutes <= 0) throw new IllegalArgumentException("cooldown-minutes doit être positif pour " + id);
    }

    public long cooldownMillis() {
        return cooldownMinutes * 60_000L;
    }

    public boolean verifiable() {
        return checkUrl != null && !checkUrl.isBlank() && success != null;
    }

    /** URL d'API avec {key} {player} {uuid} {ip} remplacés (valeurs encodées). */
    public String checkRequest(String player, UUID uuid, String ip) {
        return checkUrl
                .replace("{key}", enc(apiKey))
                .replace("{player}", enc(player))
                .replace("{uuid}", enc(uuid.toString()))
                .replace("{ip}", enc(ip));
    }

    public boolean accepts(String responseBody) {
        return success.matcher(responseBody).find();
    }

    private static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }
}
