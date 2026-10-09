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
        return expandWithKey(template, vars, random)[0];
    }

    /**
     * Remplit les emplacements et renvoie {texte, clé}. La clé est le texte sans les emplacements de remplissage
     * ({@code {~o}}, {@code {~c}}…) : deux phrases qui ne diffèrent que par « bon » ou « mdr » ont la même clé.
     */
    public String[] expandWithKey(String template, Map<String, String> vars, Random random) {
        StringBuilder text = new StringBuilder(), key = new StringBuilder();
        expand(template, vars, random, 0, text, key);
        return new String[]{clean(text.toString()), clean(key.toString())};
    }

    private static String clean(String s) {
        return s.replaceAll("\\s{2,}", " ").replaceAll(" ([?!,])", "$1").trim();
    }

    private void expand(String template, Map<String, String> vars, Random random, int depth, StringBuilder text, StringBuilder key) {
        if (depth > 4) { text.append(template); key.append(template); return; }
        Matcher m = SLOT.matcher(template);
        int last = 0;
        while (m.find()) {
            String literal = template.substring(last, m.start());
            text.append(literal);
            key.append(literal);
            String slot = m.group(1);
            if (slot.startsWith("~")) fill(slot.substring(1), vars, random, depth, text, new StringBuilder());
            else fill(slot, vars, random, depth, text, key);
            last = m.end();
        }
        String tail = template.substring(last);
        text.append(tail);
        key.append(tail);
    }

    private void fill(String slot, Map<String, String> vars, Random random, int depth, StringBuilder text, StringBuilder key) {
        if (slot.contains("|")) {
            String[] options = slot.split("\\|", -1);
            expand(options[random.nextInt(options.length)], vars, random, depth + 1, text, key);
            return;
        }
        Matcher range = RANGE.matcher(slot);
        String value = null;
        if (range.matches()) {
            int a = Integer.parseInt(range.group(1)), b = Integer.parseInt(range.group(2));
            value = String.valueOf(a + random.nextInt(Math.max(1, b - a + 1)));
        } else if (vars.containsKey(slot)) {
            value = vars.get(slot);
        }
        if (value != null) {
            text.append(value);
            key.append(value);
            return;
        }
        List<String> words = vocab.get(slot);
        if (words == null || words.isEmpty()) return;
        expand(words.get(random.nextInt(words.size())), vars, random, depth + 1, text, key);
    }

    /** Nombre approximatif de phrases différentes qu'un modèle peut produire (pour les statistiques). */
    public long variants(String template) {
        long total = 1;
        Matcher m = SLOT.matcher(template);
        while (m.find()) {
            String slot = m.group(1);
            if (slot.startsWith("~")) continue; // le remplissage ne crée pas de phrase nouvelle
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
