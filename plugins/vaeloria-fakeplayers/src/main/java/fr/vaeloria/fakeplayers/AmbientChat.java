package fr.vaeloria.fakeplayers;

import fr.vaeloria.fakeplayers.brain.ChatBrain;
import fr.vaeloria.fakeplayers.brain.Learner;
import fr.vaeloria.fakeplayers.brain.Personality;
import fr.vaeloria.fakeplayers.brain.Phrasebook;
import fr.vaeloria.fakeplayers.brain.Text;
import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.PlayerJoinEvent;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.logging.Level;

/**
 * Chat des faux joueurs, piloté par {@link ChatBrain} et la banque phrases.yml :
 * <ul>
 *   <li>messages spontanés (fréquence selon le nombre de faux joueurs) sur des sujets qui dépendent de l'heure et
 *       des goûts de chacun, et petites conversations entre faux joueurs (question, réponse, relance) ;</li>
 *   <li>réponses aux vrais joueurs selon l'intention du message ; un faux joueur à qui l'on parle poursuit la
 *       conversation quelques instants ; délai de frappe proportionnel à la longueur ;</li>
 *   <li>saluts, bienvenue aux nouveaux, au revoir selon l'heure, réactions aux morts ;</li>
 *   <li>apprentissage : les phrases qui font réagir les vrais joueurs reviennent plus souvent (brain.yml).</li>
 * </ul>
 * Chaque faux joueur a sa façon d'écrire ({@link Personality}). La plupart ne disent rien, comme les vrais.
 */
final class AmbientChat implements Listener {
    private record Pending(String templateId, long at, boolean penalize) {}
    private record Engagement(String fake, long until) {}

    private final FakePlayersPlugin plugin;
    private final Random random = new Random();
    private final Map<String, Personality> personalities = new HashMap<>();
    private final Map<String, Engagement> engaged = new HashMap<>();
    private final Map<String, Long> lastSpoke = new HashMap<>();
    private volatile ChatBrain brain;
    private Pending pending;
    private long lastSpontaneous;
    private long lastReply;
    private String lastSpeaker;

    AmbientChat(FakePlayersPlugin plugin) {
        this.plugin = plugin;
        load();
    }

    // --- Chargement / sauvegarde ---

    /** (Re)charge phrases.yml et les poids appris (brain.yml). */
    void load() {
        File file = new File(plugin.getDataFolder(), "phrases.yml");
        if (!file.exists()) plugin.saveResource("phrases.yml", false);
        YamlConfiguration yaml = YamlConfiguration.loadConfiguration(file);
        Learner learner = new Learner(plugin.getConfig().getInt("chat.no-repeat", 100));
        YamlConfiguration saved = YamlConfiguration.loadConfiguration(brainFile());
        ConfigurationSection weights = saved.getConfigurationSection("weights");
        if (weights != null) {
            Map<String, Double> map = new HashMap<>();
            for (String k : weights.getKeys(false)) map.put(k, weights.getDouble(k, 1));
            learner.load(map);
        }
        if (brain != null) learner.load(brain.learner().snapshot()); // garde l'apprentissage en cours
        Phrasebook book = parse(yaml);
        brain = new ChatBrain(book, learner);
        long variants = 0;
        for (Phrasebook.Topic t : book.topics()) for (String l : t.lines()) variants += book.variants(l);
        plugin.getLogger().info("Chat : " + book.topics().size() + " sujets, " + book.intents().size() + " intentions, "
                + book.threads().size() + " conversations, ~" + variants + " phrases spontanées possibles.");
    }

    void save() {
        ChatBrain b = brain;
        if (b == null || !plugin.getConfig().getBoolean("chat.learning", true)) return;
        YamlConfiguration yaml = new YamlConfiguration();
        b.learner().snapshot().forEach((k, v) -> {
            if (Math.abs(v - 1) > 0.01) yaml.set("weights." + k, Math.round(v * 1000) / 1000.0);
        });
        try {
            yaml.save(brainFile());
        } catch (IOException e) {
            plugin.getLogger().log(Level.WARNING, "Impossible d'enregistrer brain.yml", e);
        }
    }

    private File brainFile() { return new File(plugin.getDataFolder(), "brain.yml"); }

    private static Phrasebook parse(YamlConfiguration y) {
        Map<String, List<String>> vocab = new HashMap<>();
        ConfigurationSection v = y.getConfigurationSection("vocab");
        if (v != null) for (String k : v.getKeys(false)) vocab.put(k, v.getStringList(k));
        List<Phrasebook.Topic> topics = new ArrayList<>();
        ConfigurationSection t = y.getConfigurationSection("topics");
        if (t != null) for (String k : t.getKeys(false)) {
            topics.add(new Phrasebook.Topic(k, t.getDouble(k + ".weight", 1), Set.copyOf(t.getIntegerList(k + ".hours")),
                    t.getStringList(k + ".lines")));
        }
        List<Phrasebook.Intent> intents = new ArrayList<>();
        ConfigurationSection i = y.getConfigurationSection("intents");
        if (i != null) for (String k : i.getKeys(false)) {
            intents.add(new Phrasebook.Intent(k, i.getStringList(k + ".keywords"), i.getDouble(k + ".chance", 0.3),
                    i.getStringList(k + ".replies")));
        }
        List<Phrasebook.Thread> threads = new ArrayList<>();
        for (Map<?, ?> m : y.getMapList("threads")) {
            threads.add(new Phrasebook.Thread(Phrasebook.copy((List<?>) m.get("ask")),
                    Phrasebook.copy((List<?>) m.get("answers")), Phrasebook.copy((List<?>) m.get("follow-ups"))));
        }
        Map<String, List<String>> events = new HashMap<>();
        ConfigurationSection e = y.getConfigurationSection("events");
        if (e != null) for (String k : e.getKeys(false)) events.put(k, e.getStringList(k));
        return new Phrasebook(vocab, topics, intents, threads, events);
    }

    private ConfigurationSection cfg(String path) {
        ConfigurationSection s = plugin.getConfig().getConfigurationSection("chat." + path);
        return s != null && s.getBoolean("enabled", true) ? s : null;
    }

    private Personality personality(FakePlayer fake) {
        if (personalities.size() > 2000) personalities.clear(); // pseudos partis depuis longtemps
        return personalities.computeIfAbsent(fake.name(), Personality::of);
    }

    // --- Messages spontanés et conversations entre faux joueurs ---

    /** Chaque seconde : apprentissage (phrase ignorée), puis peut-être un message spontané. */
    void tick() {
        long now = System.currentTimeMillis();
        if (pending != null && now - pending.at() > 45_000) {
            if (pending.penalize() && learning()) brain.learner().penalize(pending.templateId());
            pending = null;
        }
        engaged.values().removeIf(e -> e.until() < now);

        ConfigurationSection auto = cfg("auto");
        int count = plugin.manager().count();
        if (auto == null || !auto.getBoolean("enabled", false) || count == 0) return;
        if (now - lastSpontaneous < auto.getLong("min-gap-seconds", 8) * 1000) return;
        double perMinute = auto.getDouble("per-minute-base", 0.3) + auto.getDouble("per-minute-per-player", 0.02) * count;
        if (random.nextDouble() >= perMinute / 60.0) return;
        FakePlayer speaker = randomSpeaker(null);
        if (speaker == null) return;
        lastSpontaneous = now;

        ConfigurationSection threads = cfg("threads");
        Phrasebook.Thread thread = threads != null && random.nextDouble() < threads.getDouble("chance", 0.25)
                ? brain.thread(random) : null;
        if (thread != null) {
            startThread(speaker, thread, threads);
            return;
        }
        ChatBrain.Line line = brain.spontaneous(personality(speaker), plugin.now().getHour(), Map.of(), random);
        if (line != null) say(speaker, line, true);
    }

    /** Question d'un faux joueur ; un autre répond parfois, puis le premier relance parfois. */
    private void startThread(FakePlayer asker, Phrasebook.Thread thread, ConfigurationSection cfg) {
        ChatBrain.Line ask = brain.line(thread.ask(), personality(asker), Map.of(), random);
        if (ask == null) return;
        say(asker, ask, true);
        if (random.nextDouble() >= cfg.getDouble("answer-chance", 0.75)) return;
        FakePlayer buddy = plugin.buddyOf(asker); // au spawn, c'est souvent celui d'à côté qui répond
        FakePlayer answerer = buddy != null && !buddy.afk() && random.nextDouble() < 0.7 ? buddy : randomSpeaker(asker.name());
        if (answerer == null || answerer == asker) return;
        ChatBrain.Line answer = brain.line(thread.answers(), personality(answerer), Map.of("player", asker.name()), random);
        if (answer == null) return;
        long answerDelay = typingTicks(answer.text()) + 20L * (2 + random.nextInt(8));
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (!present(answerer)) return;
            say(answerer, answer, false);
            if (random.nextDouble() >= cfg.getDouble("follow-up-chance", 0.4)) return;
            ChatBrain.Line follow = brain.line(thread.followUps(), personality(asker), Map.of("player", answerer.name()), random);
            if (follow != null) Bukkit.getScheduler().runTaskLater(plugin, () -> {
                if (present(asker)) say(asker, follow, false);
            }, typingTicks(follow.text()) + 20L * (1 + random.nextInt(4)));
        }, answerDelay);
    }

    // --- Arrivées, départs, événements ---

    void onFakeJoined(FakePlayer fake) {
        ConfigurationSection join = cfg("on-join");
        if (join == null || random.nextDouble() >= join.getDouble("chance", 0.12)) return;
        ChatBrain.Line line = brain.event("join", personality(fake), Map.of(), random);
        if (line == null) return;
        later(join, 3, 12, () -> {
            if (present(fake)) say(fake, line, false);
        });
    }

    /** @return délai en ticks avant la déconnexion (0 = partir tout de suite) */
    long onFakeLeaving(FakePlayer fake) {
        ConfigurationSection leave = cfg("on-leave");
        if (fake.afk()) return 0; // un AFK qui se déconnecte ne dit pas au revoir
        if (leave == null || random.nextDouble() >= leave.getDouble("chance", 0.08)) return 0;
        int hour = plugin.now().getHour();
        String key = hour >= 22 || hour < 6 ? "leave-night" : (hour == 12 || hour == 19 ? "leave-meal" : "leave");
        ChatBrain.Line line = brain.event(key, personality(fake), Map.of(), random);
        if (line == null) line = brain.event("leave", personality(fake), Map.of(), random);
        if (line == null) return 0;
        say(fake, line, false);
        return 20L * (3 + random.nextInt(6)); // le temps de « fermer le jeu »
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRealJoin(PlayerJoinEvent event) {
        ConfigurationSection greet = cfg("greet-real-players");
        if (greet == null || plugin.manager().count() == 0) return;
        boolean newcomer = !event.getPlayer().hasPlayedBefore();
        double chance = greet.getDouble("chance", 0.2) * (newcomer ? greet.getDouble("newcomer-multiplier", 2.5) : 1);
        if (random.nextDouble() >= chance) return;
        String player = event.getPlayer().getName();
        later(greet, 3, 10, () -> {
            FakePlayer speaker = randomSpeaker(null);
            if (speaker == null || Bukkit.getPlayerExact(player) == null) return;
            ChatBrain.Line line = brain.event(newcomer ? "welcome-new" : "greet-real", personality(speaker),
                    Map.of("player", player), random);
            if (line == null) return;
            say(speaker, line, false);
            engage(player, speaker);
        });
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRealDeath(PlayerDeathEvent event) {
        ConfigurationSection death = cfg("death");
        if (death == null || plugin.manager().count() == 0 || random.nextDouble() >= death.getDouble("chance", 0.1)) return;
        Player killer = event.getEntity().getKiller();
        Map<String, String> vars = Map.of("player", event.getEntity().getName(), "killer", killer == null ? "" : killer.getName());
        later(death, 2, 6, () -> {
            FakePlayer speaker = randomSpeaker(null);
            if (speaker == null) return;
            ChatBrain.Line line = brain.event("death", personality(speaker), vars, random);
            if (line != null) say(speaker, line, false);
        });
    }

    // --- Réponses aux vrais joueurs ---

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onRealChat(AsyncChatEvent event) {
        String text = PlainTextComponentSerializer.plainText().serialize(event.message());
        String player = event.getPlayer().getName();
        Bukkit.getScheduler().runTask(plugin, () -> handleReal(player, text));
    }

    private void handleReal(String player, String text) {
        long now = System.currentTimeMillis();
        rewardPending(now);
        ConfigurationSection replies = cfg("replies");
        if (replies == null || plugin.manager().count() == 0) return;
        Phrasebook.Intent intent = brain.book().detect(text);
        if (intent != null && intent.chance() <= 0) return; // ex. questions sur les bots : silence

        String normalized = Text.normalize(text);
        FakePlayer named = null;
        for (FakePlayer f : plugin.manager().all()) {
            if (!f.leaving() && Text.containsWords(normalized, f.name())) { named = f; break; }
        }
        Engagement e = engaged.get(player);
        FakePlayer partner = e == null ? null : plugin.manager().get(e.fake());

        if (named != null && named.afk()) { // il ne voit pas le message : il s'en occupera en revenant
            plugin.pingedWhileAfk(named, player);
            return;
        }
        if (partner != null && partner.afk()) partner = null;
        FakePlayer speaker;
        double chance;
        List<String> templates;
        if (named != null) {                                   // on lui parle directement
            speaker = named;
            chance = replies.getDouble("when-named-chance", 0.6);
            templates = intent != null ? intent.replies() : brain.book().event("named");
        } else if (partner != null && !partner.leaving()) {    // conversation en cours
            speaker = partner;
            chance = replies.getDouble("engaged-chance", 0.6);
            templates = intent != null ? intent.replies() : brain.book().event("continue");
        } else if (intent != null) {                           // message général : quelqu'un réagit parfois
            if (now - lastReply < replies.getLong("cooldown-seconds", 15) * 1000) return;
            speaker = randomSpeaker(null);
            chance = intent.chance() * replies.getDouble("chance", 1.0);
            templates = intent.replies();
        } else {
            return;
        }
        if (speaker == null || random.nextDouble() >= chance) return;
        Long spoke = lastSpoke.get(speaker.name());
        if (spoke != null && now - spoke < replies.getLong("per-fake-cooldown-seconds", 6) * 1000) return;
        ChatBrain.Line line = brain.line(templates, personality(speaker), Map.of("player", player), random);
        if (line == null) return;
        lastReply = now;
        lastSpoke.put(speaker.name(), now + 60_000); // réservé pendant la frappe
        engage(player, speaker);
        FakePlayer who = speaker;
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (present(who)) say(who, line, false);
        }, typingTicks(line.text()) + 20L * random.nextInt(3));
    }

    /** Un vrai joueur frappe le faux joueur au spawn : il réagit parfois (« ? », « arrête »…), et poursuit la conversation. */
    void reactToHit(FakePlayer fake, String attacker) {
        ConfigurationSection hit = cfg("hit");
        if (fake.afk()) { plugin.pingedWhileAfk(fake, attacker); return; }
        if (hit == null || !present(fake) || random.nextDouble() >= hit.getDouble("chance", 0.5)) return;
        ChatBrain.Line line = brain.event("hit", personality(fake), Map.of("player", attacker), random);
        if (line == null) return;
        engage(attacker, fake);
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (present(fake)) say(fake, line, false);
        }, 10 + typingTicks(line.text()));
    }

    /** Retour d'AFK : « dsl j'étais afk <joueur> » si quelqu'un l'a sollicité, sinon parfois juste « re ». */
    void afkBack(FakePlayer fake, String pinger) {
        if (!present(fake)) return;
        if (pinger == null && random.nextDouble() >= 0.25) return;
        ChatBrain.Line line = brain.event(pinger != null ? "afk-back-pinged" : "afk-back", personality(fake),
                Map.of("player", pinger == null ? "" : pinger), random);
        if (line == null) return;
        if (pinger != null) engage(pinger, fake);
        Bukkit.getScheduler().runTaskLater(plugin, () -> {
            if (present(fake)) say(fake, line, false);
        }, 20 + typingTicks(line.text()));
    }

    /**
     * Réponse à un message privé (null = pas de réponse). Les intentions de phrases.yml sont utilisées d'abord,
     * puis les réponses génériques « whisper ». Le faux joueur reste engagé dans la conversation.
     */
    String whisperReply(FakePlayer fake, String text, String player) {
        rewardPending(System.currentTimeMillis());
        if (fake.afk()) {
            plugin.pingedWhileAfk(fake, player);
            return null;
        }
        Phrasebook.Intent intent = brain.book().detect(text);
        if (intent != null && intent.chance() <= 0) return null;
        List<String> templates = intent != null ? intent.replies() : brain.book().event("whisper");
        ChatBrain.Line line = brain.line(templates, personality(fake), Map.of("player", player), random);
        if (line == null) return null;
        engage(player, fake);
        pending = new Pending(line.templateId(), System.currentTimeMillis(), false);
        return line.text();
    }

    /** Délai de « frappe » d'un message, en ticks : ~0,15 s par caractère, entre 1,5 et 12 s. */
    long typingTicks(String text) {
        double seconds = Math.min(12, 1.5 + text.length() * 0.15 * (0.7 + random.nextDouble() * 0.6));
        return Math.round(seconds * 20);
    }

    // --- Outils ---

    private void rewardPending(long now) {
        if (pending != null && now - pending.at() <= 45_000 && learning()) brain.learner().reward(pending.templateId());
        pending = null;
    }

    private boolean learning() {
        return plugin.getConfig().getBoolean("chat.learning", true);
    }

    private void engage(String player, FakePlayer fake) {
        long seconds = plugin.getConfig().getLong("chat.replies.engage-seconds", 90);
        engaged.put(player, new Engagement(fake.name(), System.currentTimeMillis() + seconds * 1000));
    }

    private boolean present(FakePlayer fake) {
        return plugin.manager().get(fake.name()) == fake && !fake.leaving();
    }

    private void say(FakePlayer speaker, ChatBrain.Line line, boolean learnable) {
        if (line.text().isBlank()) return;
        lastSpeaker = speaker.name();
        lastSpoke.put(speaker.name(), System.currentTimeMillis());
        if (learnable) pending = new Pending(line.templateId(), System.currentTimeMillis(), true);
        plugin.manager().chat(speaker, line.text());
    }

    /** Faux joueur au hasard, pondéré par son goût pour la discussion, sans répéter le dernier qui a parlé. */
    private FakePlayer randomSpeaker(String exclude) {
        List<FakePlayer> candidates = new ArrayList<>();
        double total = 0;
        for (FakePlayer f : plugin.manager().all()) {
            if (f.leaving() || f.afk() || f.name().equals(exclude) || f.name().equals(lastSpeaker)) continue;
            candidates.add(f);
            total += personality(f).chattiness();
        }
        if (candidates.isEmpty()) {
            for (FakePlayer f : plugin.manager().all()) if (!f.leaving() && !f.afk() && !f.name().equals(exclude)) return f;
            return null;
        }
        double roll = random.nextDouble() * total;
        for (FakePlayer f : candidates) {
            roll -= personality(f).chattiness();
            if (roll < 0) return f;
        }
        return candidates.get(candidates.size() - 1);
    }

    private void later(ConfigurationSection section, int defMin, int defMax, Runnable task) {
        int min = Math.max(0, section.getInt("delay-seconds.min", defMin));
        int max = Math.max(min, section.getInt("delay-seconds.max", defMax));
        long ticks = 20L * (min + ThreadLocalRandom.current().nextInt(max - min + 1)) + 1;
        Bukkit.getScheduler().runTaskLater(plugin, task, ticks);
    }
}
