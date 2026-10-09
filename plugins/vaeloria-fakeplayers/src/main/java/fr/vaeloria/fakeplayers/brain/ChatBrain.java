package fr.vaeloria.fakeplayers.brain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Choix de ce que dit un faux joueur : sujet (selon l'heure et ses sujets favoris), modèle (selon l'apprentissage
 * et sans répétition), mots du modèle, puis réécriture dans son style. Indépendant de Bukkit.
 */
public final class ChatBrain {
    /** Phrase prête à envoyer, avec l'identifiant de son modèle (pour l'apprentissage). */
    public record Line(String text, String templateId) {}

    /** Réactions courtes (« gg », « re », « slt », « ? ») : ce sont des mots, pas des phrases, elles peuvent revenir. */
    static final int SHORT_KEY = 10;
    private static final int SHORT_MEMORY = 40;

    private final Phrasebook book;
    private final Learner learner;
    private final SeenTexts seen;
    /** Les réactions courtes ne reviennent quand même pas avant 40 messages. */
    private final java.util.LinkedHashSet<String> recentShort = new java.util.LinkedHashSet<>();

    public ChatBrain(Phrasebook book, Learner learner) {
        this(book, learner, new SeenTexts(200_000));
    }

    public ChatBrain(Phrasebook book, Learner learner, SeenTexts seen) {
        this.book = book;
        this.learner = learner;
        this.seen = seen;
    }

    public SeenTexts seen() { return seen; }

    public Phrasebook book() { return book; }
    public Learner learner() { return learner; }

    /** Message spontané : sujet pondéré (×2,5 pour les sujets favoris du joueur), actif à cette heure. */
    public Line spontaneous(Personality p, int hour, Map<String, String> vars, Random random) {
        for (int attempt = 0; attempt < 4; attempt++) { // sujet épuisé : on en essaie un autre
            Line line = spontaneousOnce(p, hour, vars, random);
            if (line != null) return line;
        }
        return null;
    }

    private Line spontaneousOnce(Personality p, int hour, Map<String, String> vars, Random random) {
        List<Phrasebook.Topic> active = new ArrayList<>();
        double total = 0;
        for (Phrasebook.Topic t : book.topics()) {
            if (t.activeAt(hour) && !t.lines().isEmpty()) { active.add(t); total += weight(t, p); }
        }
        if (active.isEmpty()) return null;
        double roll = random.nextDouble() * total;
        Phrasebook.Topic chosen = active.get(active.size() - 1);
        for (Phrasebook.Topic t : active) {
            roll -= weight(t, p);
            if (roll < 0) { chosen = t; break; }
        }
        return line(chosen.lines(), p, vars, random);
    }

    /** Poids du sujet : ×2,5 s'il fait partie des favoris, réduit quand ses phrases ont toutes servi récemment. */
    private double weight(Phrasebook.Topic t, Personality p) {
        double fresh = learner.freshness(t.lines());
        return t.weight() * (p.favoriteTopics().contains(t.key()) ? 2.5 : 1) * (0.05 + fresh * fresh);
    }

    /** Phrase tirée d'une liste de modèles (événement, réponse…), ou null si la liste est vide. */
    /**
     * Phrase tirée d'une liste de modèles, jamais dite auparavant (mémoire permanente) : jusqu'à 25 essais, puis
     * null (le faux joueur se tait plutôt que de se répéter). Les réactions courtes (« gg », « re »…) sont permises
     * à nouveau après 40 messages.
     */
    public synchronized Line line(List<String> templates, Personality p, Map<String, String> vars, Random random) {
        if (templates.isEmpty()) return null;
        for (int attempt = 0; attempt < 25; attempt++) {
            String template = pickByVariety(templates, random);
            if (template == null) return null;
            String[] out = book.expandWithKey(template, vars, random);
            String key = Text.normalize(out[1]);
            if (key.isEmpty() && Text.normalize(out[0]).isEmpty()) continue;
            boolean isShort = key.length() <= SHORT_KEY;
            if (isShort ? recentShort.contains(key) : seen.contains(out[1])) continue;
            if (isShort) {
                recentShort.add(key);
                if (recentShort.size() > SHORT_MEMORY) recentShort.remove(recentShort.iterator().next());
            } else {
                seen.add(out[1]);
            }
            String styled = p.style(out[0], random);
            return styled.isBlank() ? null : new Line(styled, Learner.id(template));
        }
        return null;
    }

    /**
     * Modèle choisi par l'apprentissage, puis pondéré par sa variété : un modèle qui ne donne qu'une poignée de
     * phrases sort beaucoup plus rarement (sinon il s'épuise en quelques jours et le faux joueur se tait).
     */
    private String pickByVariety(List<String> templates, Random random) {
        for (int i = 0; i < 4; i++) {
            String t = learner.pick(templates, random, 1);
            if (t == null) return null;
            double variety = Math.min(1, Math.max(0.04, Math.log10(Math.max(1, book.variants(t))) / 3.5));
            if (random.nextDouble() < variety) return t;
        }
        return learner.pick(templates, random, 1);
    }

    public Line event(String key, Personality p, Map<String, String> vars, Random random) {
        return line(book.event(key), p, vars, random);
    }

    /** Réponse à un message selon son intention, ou null si aucune intention n'est reconnue. */
    public Line reply(String message, Personality p, Map<String, String> vars, Random random) {
        Phrasebook.Intent intent = book.detect(message);
        return intent == null ? null : line(intent.replies(), p, vars, random);
    }

    public Phrasebook.Thread thread(Random random) {
        List<Phrasebook.Thread> threads = book.threads();
        return threads.isEmpty() ? null : threads.get(random.nextInt(threads.size()));
    }
}
