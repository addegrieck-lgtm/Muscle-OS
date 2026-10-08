package fr.vaeloria.factions.rules;

import java.util.regex.Pattern;

/** Validation des liens de webhook Discord saisis par les joueurs. */
public final class WebhookRules {
    public static final String DEFAULT_PATTERN =
            "^https://(?:(?:ptb|canary)\\.)?discord(?:app)?\\.com/api/webhooks/\\d{5,25}/[A-Za-z0-9_-]{20,120}$";

    private WebhookRules() {}

    public static boolean valid(String url, String pattern) {
        if (url == null || url.length() > 300) return false;
        try {
            return Pattern.compile(pattern == null || pattern.isBlank() ? DEFAULT_PATTERN : pattern).matcher(url).matches();
        } catch (java.util.regex.PatternSyntaxException e) {
            return false;
        }
    }

    /** Version affichable : on ne montre jamais le jeton du webhook. */
    public static String masked(String url) {
        if (url == null) return "aucun";
        int i = url.lastIndexOf('/');
        return i < 0 ? "***" : url.substring(0, i + 1) + "••••••";
    }

    /** Neutralise les mentions et le formatage Markdown dans un texte de joueur envoyé sur Discord. */
    public static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("@", "@​").replace("*", "\\*").replace("_", "\\_")
                .replace("~", "\\~").replace("`", "\\`").replace("|", "\\|").replace(">", "\\>");
    }
}
