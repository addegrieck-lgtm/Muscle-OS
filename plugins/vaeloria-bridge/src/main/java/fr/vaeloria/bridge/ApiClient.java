package fr.vaeloria.bridge;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

/** Client HTTP signé. Toujours appelé hors du thread principal du serveur. */
public final class ApiClient {
    public record Response(int status, String body) {
        public boolean ok() { return status >= 200 && status < 300; }
    }

    private final HttpClient http;
    private final String baseUrl;
    private final String keyId;
    private final String secret;
    private final Duration timeout;

    public ApiClient(String baseUrl, String keyId, String secret, Duration timeout) {
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.keyId = keyId;
        this.secret = secret;
        this.timeout = timeout;
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    public Response post(String path, String json) throws IOException, InterruptedException {
        String timestamp = Long.toString(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString();
        HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + path))
                .timeout(timeout)
                .header("content-type", "application/json")
                .header("x-vaeloria-key", keyId)
                .header("x-vaeloria-timestamp", timestamp)
                .header("x-vaeloria-nonce", nonce)
                .header("x-vaeloria-signature", Signer.sign(secret, timestamp, nonce, json))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        return new Response(res.statusCode(), res.body());
    }
}
