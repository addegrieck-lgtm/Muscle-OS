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

    private static final int TEXT_MEMORY = 250;

    private final Phrasebook book;
    private final Learner learner;
    /** Dernières phrases envoyées (texte final) : une phrase identique ne ressort pas avant 250 messages. */
    private final java.util.LinkedHashSet<String> recentTexts = new java.util.LinkedHashSet<>();

    public ChatBrain(Phrasebook book, Learner learner) {
        this.book = book;
        this.learner = learner;
    }

    public Phrasebook book() { return book; }
    public Learner learner() { return learner; }

    /** Message spontané : sujet pondéré (×2,5 pour les sujets favoris du joueur), actif à cette heure. */
    public Line spontaneous(Personality p, int hour, Map<String, String> vars, Random random) {
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
    public synchronized Line line(List<String> templates, Personality p, Map<String, String> vars, Random random) {
        String template = null, text = null;
        for (int attempt = 0; attempt < 6; attempt++) { // évite une phrase identique à une phrase récente
            template = learner.pick(templates, random, 1);
            if (template == null) return null;
            text = book.expand(template, vars, random);
            if (!recentTexts.contains(Text.normalize(text))) break;
        }
        String key = Text.normalize(text);
        recentTexts.remove(key);
        recentTexts.add(key);
        if (recentTexts.size() > TEXT_MEMORY) recentTexts.remove(recentTexts.iterator().next());
        String styled = p.style(text, random);
        return styled.isBlank() ? null : new Line(styled, Learner.id(template));
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
