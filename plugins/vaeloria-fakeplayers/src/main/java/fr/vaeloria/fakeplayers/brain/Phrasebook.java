package fr.vaeloria.fakeplayers.brain;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Banque de phrases : modèles avec emplacements, vocabulaire, sujets spontanés, intentions et événements.
 *
 * <p>Syntaxe des modèles : {@code {item}} = mot au hasard du vocabulaire « item » ; {@code {a|b|c}} = une des
 * variantes ; {@code {n:2-64}} = nombre entre 2 et 64 ; {@code {player}}, {@code {target}}… = variables fournies.
 * Un mot de vocabulaire peut lui-même contenir des emplacements.
 */
public final class Phrasebook {
    private static final Pattern SLOT = Pattern.compile("\\{([^{}]+)}");
    private static final Pattern RANGE = Pattern.compile("n:(\\d+)-(\\d+)");

    /** Sujet de messages spontanés. {@code hours} vide = toute la journée. */
    public record Topic(String key, double weight, Set<Integer> hours, List<String> lines) {
        public boolean activeAt(int hour) {
            return hours.isEmpty() || hours.contains(hour);
        }
    }

    /** Intention reconnue dans un message (mots-clés) et réponses possibles. */
    public record Intent(String key, List<String> keywords, double chance, List<String> replies) {}

    /** Question posée par un faux joueur, à laquelle d'autres faux joueurs peuvent répondre. */
    public record Thread(List<String> ask, List<String> answers, List<String> followUps) {}

    private final Map<String, List<String>> vocab;
    private final List<Topic> topics;
    private final List<Intent> intents;
    private final List<Thread> threads;
    private final Map<String, List<String>> events;

    public Phrasebook(Map<String, List<String>> vocab, List<Topic> topics, List<Intent> intents,
                      List<Thread> threads, Map<String, List<String>> events) {
        this.vocab = new LinkedHashMap<>(vocab);
        this.topics = List.copyOf(topics);
        this.intents = List.copyOf(intents);
        this.threads = List.copyOf(threads);
        this.events = new LinkedHashMap<>(events);
    }

    public List<Topic> topics() { return topics; }
    public List<Intent> intents() { return intents; }
    public List<Thread> threads() { return threads; }

    public List<String> event(String key) {
        return events.getOrDefault(key, List.of());
    }

    /** Première intention dont un mot-clé apparaît dans le message (ordre du fichier), ou null. */
    public Intent detect(String message) {
        String normalized = Text.normalize(message);
        for (Intent intent : intents) {
            for (String keyword : intent.keywords()) {
                if (keyword.equals("?") ? normalized.endsWith("?") : Text.containsWords(normalized, keyword)) return intent;
            }
        }
        return null;
    }

    public Intent intent(String key) {
        for (Intent intent : intents) if (intent.key().equals(key)) return intent;
        return null;
    }

    /** Remplit les emplacements d'un modèle. */
    public String expand(String template, Map<String, String> vars, Random random) {
        return expand(template, vars, random, 0).replaceAll("\\s{2,}", " ").trim();
    }

    private String expand(String template, Map<String, String> vars, Random random, int depth) {
        if (depth > 4) return template;
        Matcher m = SLOT.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            m.appendReplacement(out, Matcher.quoteReplacement(fill(m.group(1), vars, random, depth)));
        }
        m.appendTail(out);
        return out.toString();
    }

    private String fill(String slot, Map<String, String> vars, Random random, int depth) {
        if (slot.contains("|")) {
            String[] options = slot.split("\\|", -1);
            return expand(options[random.nextInt(options.length)], vars, random, depth + 1);
        }
        Matcher range = RANGE.matcher(slot);
        if (range.matches()) {
            int a = Integer.parseInt(range.group(1)), b = Integer.parseInt(range.group(2));
            return String.valueOf(a + random.nextInt(Math.max(1, b - a + 1)));
        }
        if (vars.containsKey(slot)) return vars.get(slot);
        List<String> words = vocab.get(slot);
        if (words == null || words.isEmpty()) return "";
        return expand(words.get(random.nextInt(words.size())), vars, random, depth + 1);
    }

    /** Nombre approximatif de phrases différentes qu'un modèle peut produire (pour les statistiques). */
    public long variants(String template) {
        long total = 1;
        Matcher m = SLOT.matcher(template);
        while (m.find()) {
            String slot = m.group(1);
            long n = slot.contains("|") ? slot.split("\\|", -1).length
                    : RANGE.matcher(slot).matches() ? 10 : vocab.getOrDefault(slot, List.of("")).size();
            total = Math.min(Long.MAX_VALUE / 100, total * Math.max(1, n));
        }
        return total;
    }

    public static List<String> copy(List<?> raw) {
        List<String> out = new ArrayList<>();
        if (raw != null) for (Object o : raw) if (o != null) out.add(o.toString());
        return out;
    }
}
