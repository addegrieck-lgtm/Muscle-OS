package fr.vaeloria.fakeplayers.brain;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Apprentissage : chaque modèle de phrase a un poids. Une phrase suivie d'une réaction d'un vrai joueur
 * gagne du poids (elle reviendra plus souvent), une phrase ignorée en perd un peu. Les modèles récents
 * sont exclus pour éviter les répétitions. Les poids sont sauvegardés (aucun message de joueur n'est stocké).
 */
public final class Learner {
    public static final double MIN = 0.3, MAX = 5.0, REWARD = 1.25, PENALTY = 0.96;

    private final Map<String, Double> weights = new ConcurrentHashMap<>();
    private final Deque<String> recent = new ArrayDeque<>();
    private final int memory;

    public Learner(int memory) {
        this.memory = Math.max(1, memory);
    }

    public static String id(String template) {
        return Integer.toHexString(template.hashCode());
    }

    public double weight(String template) {
        return weights.getOrDefault(id(template), 1.0);
    }

    public void reward(String templateId) {
        weights.merge(templateId, REWARD, (w, f) -> Math.min(MAX, w * f));
    }

    public void penalize(String templateId) {
        weights.merge(templateId, PENALTY, (w, f) -> Math.max(MIN, w * f));
    }

    /** Choix pondéré par l'apprentissage (× bonus), sans reprendre un modèle utilisé récemment. */
    public synchronized String pick(List<String> templates, Random random, double bonus) {
        if (templates.isEmpty()) return null;
        double total = 0;
        double[] w = new double[templates.size()];
        for (int i = 0; i < w.length; i++) {
            String t = templates.get(i);
            w[i] = recent.contains(id(t)) ? 0 : weight(t) * bonus;
            total += w[i];
        }
        if (total <= 0) return remember(oldest(templates)); // tout a servi récemment : le plus ancien
        double roll = random.nextDouble() * total;
        for (int i = 0; i < w.length; i++) {
            roll -= w[i];
            if (roll < 0) return remember(templates.get(i));
        }
        return remember(templates.get(w.length - 1));
    }

    /** Part des modèles qui n'ont pas servi récemment (0 à 1). */
    public synchronized double freshness(List<String> templates) {
        if (templates.isEmpty()) return 0;
        int fresh = 0;
        for (String t : templates) if (!recent.contains(id(t))) fresh++;
        return (double) fresh / templates.size();
    }

    private String oldest(List<String> templates) {
        for (String id : recent) {
            for (String t : templates) if (id(t).equals(id)) return t;
        }
        return templates.get(0);
    }

    private String remember(String template) {
        recent.remove(id(template));
        recent.addLast(id(template));
        while (recent.size() > memory) recent.removeFirst();
        return template;
    }

    public Map<String, Double> snapshot() {
        return Map.copyOf(weights);
    }

    public void load(Map<String, Double> saved) {
        saved.forEach((k, v) -> weights.put(k, Math.max(MIN, Math.min(MAX, v))));
    }
}
