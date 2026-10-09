package fr.vaeloria.fakeplayers.brain;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class BrainTest {
    /** Lit la vraie banque src/main/resources/phrases.yml. */
    @SuppressWarnings("unchecked")
    static Phrasebook book() {
        InputStream in = BrainTest.class.getResourceAsStream("/phrases.yml");
        assertNotNull(in, "phrases.yml introuvable");
        Map<String, Object> y = new Yaml().load(in);
        Map<String, List<String>> vocab = new HashMap<>();
        ((Map<String, List<Object>>) y.get("vocab")).forEach((k, v) -> vocab.put(k, Phrasebook.copy(v)));
        List<Phrasebook.Topic> topics = new ArrayList<>();
        ((Map<String, Map<String, Object>>) y.get("topics")).forEach((k, t) -> topics.add(new Phrasebook.Topic(k,
                ((Number) t.getOrDefault("weight", 1)).doubleValue(),
                Set.copyOf((List<Integer>) t.getOrDefault("hours", List.of())), Phrasebook.copy((List<?>) t.get("lines")))));
        List<Phrasebook.Intent> intents = new ArrayList<>();
        ((Map<String, Map<String, Object>>) y.get("intents")).forEach((k, i) -> intents.add(new Phrasebook.Intent(k,
                Phrasebook.copy((List<?>) i.get("keywords")), ((Number) i.get("chance")).doubleValue(),
                Phrasebook.copy((List<?>) i.get("replies")))));
        List<Phrasebook.Thread> threads = new ArrayList<>();
        for (Map<String, Object> t : (List<Map<String, Object>>) y.get("threads")) {
            threads.add(new Phrasebook.Thread(Phrasebook.copy((List<?>) t.get("ask")), Phrasebook.copy((List<?>) t.get("answers")),
                    Phrasebook.copy((List<?>) t.get("follow-ups"))));
        }
        Map<String, List<String>> events = new HashMap<>();
        ((Map<String, List<Object>>) y.get("events")).forEach((k, v) -> events.put(k, Phrasebook.copy(v)));
        return new Phrasebook(vocab, topics, intents, threads, events);
    }

    @Test
    void everyTemplateExpandsCompletely() {
        Phrasebook book = book();
        Random r = new Random(1);
        Map<String, String> vars = Map.of("player", "Steve", "killer", "Alex");
        List<String> all = new ArrayList<>();
        book.topics().forEach(t -> all.addAll(t.lines()));
        book.intents().forEach(i -> all.addAll(i.replies()));
        book.threads().forEach(t -> { all.addAll(t.ask()); all.addAll(t.answers()); all.addAll(t.followUps()); });
        for (String key : List.of("join", "leave", "leave-night", "leave-meal", "greet-real", "welcome-new", "death",
                "named", "continue", "whisper", "hit", "afk-back", "afk-back-pinged")) {
            assertFalse(book.event(key).isEmpty(), "événement vide : " + key);
            all.addAll(book.event(key));
        }
        assertTrue(all.size() > 300, "banque trop petite : " + all.size());
        for (String template : all) {
            for (int i = 0; i < 5; i++) {
                String out = book.expand(template, vars, r);
                assertFalse(out.contains("{") || out.contains("}"), "emplacement non rempli : " + template + " → " + out);
                assertFalse(out.isBlank(), "phrase vide : " + template);
            }
        }
    }

    @Test
    void detectsIntentsInRealMessages() {
        Phrasebook book = book();
        Map<String, String> cases = Map.ofEntries(
                Map.entry("Salut tout le monde !", "greeting"), Map.entry("ça va vous ?", "how"),
                Map.entry("le KOTH c'est quand", "koth"), Map.entry("qui veut 1v1 au spawn", "duel"),
                Map.entry("je vends 3 stacks de diams", "trade"), Map.entry("on recrute dans ma fac", "recruit"),
                Map.entry("gg à tous", "gg"), Map.entry("t'es un bot ?", "bot"), Map.entry("merci !", "thanks"),
                Map.entry("ça lag de fou", "lag"), Map.entry("bonne nuit tlm", "bye"), Map.entry("re", "back"),
                Map.entry("tu sais où est le nether ?", "question"), Map.entry("ez noob", "insult"),
                Map.entry("vous êtes dans quelle fac", "which-fac"));
        cases.forEach((message, expected) -> {
            Phrasebook.Intent intent = book.detect(message);
            assertNotNull(intent, "aucune intention pour : " + message);
            assertEquals(expected, intent.key(), message);
        });
        assertNull(book.detect("je construis une maison"));
        assertEquals(0, book.intent("bot").chance(), "les faux joueurs ne parlent pas des bots");
    }

    @Test
    void spontaneousMessagesRarelyRepeat() {
        ChatBrain brain = new ChatBrain(book(), new Learner(100));
        Random r = new Random(7);
        Set<String> seen = new HashSet<>();
        int duplicates = 0;
        for (int i = 0; i < 300; i++) {
            Personality p = Personality.of("joueur" + (i % 40));
            ChatBrain.Line line = brain.spontaneous(p, 21, Map.of(), r);
            assertNotNull(line);
            // « gg », « re », « mdr » reviennent forcément ; on mesure les vraies phrases.
            if (line.text().length() > 15 && !seen.add(line.text())) duplicates++;
        }
        assertTrue(duplicates < 10, "trop de phrases répétées : " + duplicates + " sur 300 (~2 h de chat)");
    }

    @Test
    void hourlyTopicsOnlyAtTheirHours() {
        Phrasebook book = book();
        Phrasebook.Topic meal = book.topics().stream().filter(t -> t.key().equals("meal")).findFirst().orElseThrow();
        assertTrue(meal.activeAt(12));
        assertFalse(meal.activeAt(16));
    }

    @Test
    void learnerFavoursRewardedTemplates() {
        Learner learner = new Learner(1);
        List<String> templates = List.of("a", "b");
        for (int i = 0; i < 8; i++) learner.reward(Learner.id("a"));
        for (int i = 0; i < 20; i++) learner.penalize(Learner.id("b"));
        assertEquals(Learner.MAX, learner.weight("a"), 1e-9);
        assertTrue(learner.weight("b") < 0.5);
        Random r = new Random(3);
        int a = 0;
        for (int i = 0; i < 1000; i++) {
            learner = new Learner(1); // sans mémoire de répétition pour mesurer la préférence seule
            learner.load(Map.of(Learner.id("a"), Learner.MAX, Learner.id("b"), 0.4));
            if (learner.pick(templates, r, 1).equals("a")) a++;
        }
        assertTrue(a > 850, "a choisi " + a + " fois sur 1000");
    }

    @Test
    void learnerNeverRepeatsWithinMemory() {
        Learner learner = new Learner(3);
        List<String> templates = List.of("a", "b", "c", "d");
        Random r = new Random(5);
        List<String> picks = new ArrayList<>();
        for (int i = 0; i < 40; i++) picks.add(learner.pick(templates, r, 1));
        for (int i = 1; i < picks.size(); i++) {
            for (int j = Math.max(0, i - 3); j < i; j++) assertNotEquals(picks.get(j), picks.get(i), "répétition à " + i);
        }
    }

    @Test
    void personalityIsStableAndStyles() {
        assertEquals(Personality.of("Lucas59"), Personality.of("lucas59"));
        Personality p = new Personality(1, 1, false, false, 0, "", 0, Set.of("pvp"));
        String styled = p.style("je suis pas sûr, quelqu'un a vu le koth ?", new Random(1));
        assertEquals("jsuis pas sur, qqn a vu le koth ?", styled);
    }

    /** Pas un test : affiche un échantillon pour relire la qualité (gradle test --info). */
    @Test
    void printSample() {
        ChatBrain brain = new ChatBrain(book(), new Learner(60));
        Random r = new Random(42);
        String[] names = {"Lucas59", "KrakenFR", "patate_nuage", "Shadow_Knight", "Ines61", "TheTonnerre2012"};
        StringBuilder out = new StringBuilder("\n--- 21 h ---\n");
        for (int i = 0; i < 25; i++) {
            String n = names[r.nextInt(names.length)];
            out.append("<").append(n).append("> ").append(brain.spontaneous(Personality.of(n), 21, Map.of(), r).text()).append('\n');
        }
        out.append("--- réponses ---\n");
        for (String msg : List.of("salut tlm", "le koth c'est quand ?", "qui 1v1", "je vends des diams", "ça va ?",
                "vous êtes dans quelle fac", "gg", "t'es un bot ?")) {
            ChatBrain.Line l = brain.reply(msg, Personality.of("Ines61"), Map.of("player", "Steve"), r);
            out.append("<Steve> ").append(msg).append("\n   <Ines61> ").append(l == null ? "(rien)" : l.text()).append('\n');
        }
        System.out.println(out);
    }
}
