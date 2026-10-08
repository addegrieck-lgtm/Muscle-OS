package fr.vaeloria.fakeplayers;

import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

import java.text.Normalizer;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;

/**
 * Chat des faux joueurs, pensé pour rester crédible :
 * <ul>
 *   <li>messages spontanés dont la fréquence suit le nombre de faux joueurs, avec un écart minimum et sans répétition ;</li>
 *   <li>« slt » de temps en temps juste après une connexion, « a+ » / « bn » (la nuit) juste avant un départ ;</li>
 *   <li>réponses aux vrais joueurs (bonjour, gg, ça va…), avec un délai de frappe, et salut aux vrais joueurs qui arrivent.</li>
 * </ul>
 * Toutes les probabilités sont faibles par défaut : la plupart des faux joueurs ne disent rien, comme les vrais.
 */
final class AmbientChat implements Listener {
    private static final Pattern NON_WORD = Pattern.compile("[^a-z0-9?]+");

    private final FakePlayersPlugin plugin;
    private final Deque<String> recent = new ArrayDeque<>();
    private long lastSpontaneous;
    private long lastReply;
    private String lastSpeaker;

    AmbientChat(FakePlayersPlugin plugin) {
        this.plugin = plugin;
    }

    private ConfigurationSection cfg(String path) {
        ConfigurationSection s = plugin.getConfig().getConfigurationSection("chat." + path);
        return s != null && s.getBoolean("enabled", true) ? s : null;
    }

    /** Chaque seconde : peut-être un message spontané. */
    void tick() {
        ConfigurationSection auto = cfg("auto");
        int count = plugin.manager().count();
        if (auto == null || !auto.getBoolean("enabled", false) || count == 0) return;
        long now = System.currentTimeMillis();
        if (now - lastSpontaneous < auto.getLong("min-gap-seconds", 8) * 1000) return;
        double perMinute = auto.getDouble("per-minute-base", 0.3) + auto.getDouble("per-minute-per-player", 0.02) * count;
        if (ThreadLocalRandom.current().nextDouble() >= perMinute / 60.0) return;
        FakePlayer speaker = randomSpeaker(null);
        String message = pickFresh(auto.getStringList("messages"), auto.getInt("no-repeat", 20));
        if (speaker == null || message == null) return;
        lastSpontaneous = now;
        say(speaker, message, null);
    }

    /** Un faux joueur vient d'arriver : parfois il dit bonjour quelques secondes après. */
    void onFakeJoined(FakePlayer fake) {
        ConfigurationSection join = cfg("on-join");
        if (join == null || ThreadLocalRandom.current().nextDouble() >= join.getDouble("chance", 0.12)) return;
        String message = pickFresh(join.getStringList("messages"), 6);
        if (message == null) return;
        later(join, 3, 12, () -> {
            if (plugin.manager().get(fake.name()) == fake && !fake.leaving()) say(fake, message, null);
        });
    }

    /**
     * Un faux joueur va partir : parfois il le dit d'abord.
     * @return délai en ticks avant la déconnexion (0 = partir tout de suite)
     */
    long onFakeLeaving(FakePlayer fake) {
        ConfigurationSection leave = cfg("on-leave");
        ThreadLocalRandom r = ThreadLocalRandom.current();
        if (leave == null || r.nextDouble() >= leave.getDouble("chance", 0.08)) return 0;
        int hour = plugin.now().getHour();
        List<String> pool = (hour >= 22 || hour < 6) && !leave.getStringList("night-messages").isEmpty()
                ? leave.getStringList("night-messages") : leave.getStringList("messages");
        String message = pickFresh(pool, 6);
        if (message == null) return 0;
        say(fake, message, null);
        return 20L * (3 + r.nextInt(6)); // le temps de « fermer le jeu »
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onRealChat(AsyncChatEvent event) {
        String text = PlainTextComponentSerializer.plainText().serialize(event.message());
        String player = event.getPlayer().getName();
        Bukkit.getScheduler().runTask(plugin, () -> reply(player, text));
    }

    @EventHandler(priority = EventPriority.MONITOR)
    public void onRealJoin(PlayerJoinEvent event) {
        ConfigurationSection greet = cfg("greet-real-players");
        if (greet == null || plugin.manager().count() == 0) return;
        if (ThreadLocalRandom.current().nextDouble() >= greet.getDouble("chance", 0.2)) return;
        String player = event.getPlayer().getName();
        String message = pickFresh(greet.getStringList("messages"), 6);
        if (message == null) return;
        later(greet, 3, 10, () -> {
            FakePlayer speaker = randomSpeaker(null);
            if (speaker != null && Bukkit.getPlayerExact(player) != null) say(speaker, message, player);
        });
    }

    private void reply(String player, String text) {
        ConfigurationSection replies = cfg("replies");
        if (replies == null || plugin.manager().count() == 0) return;
        long now = System.currentTimeMillis();
        if (now - lastReply < replies.getLong("cooldown-seconds", 20) * 1000) return;
        String normalized = normalize(text);
        String padded = " " + normalized + " ";
        ThreadLocalRandom r = ThreadLocalRandom.current();

        // Un vrai joueur cite le pseudo d'un faux : celui-ci répond parfois (« ? », « oui ? »).
        FakePlayer named = null;
        for (FakePlayer f : plugin.manager().all()) {
            if (!f.leaving() && padded.contains(" " + normalize(f.name()) + " ")) { named = f; break; }
        }
        List<String> answers = null;
        if (named != null && r.nextDouble() < replies.getDouble("when-named-chance", 0.5)) {
            answers = replies.getStringList("when-named");
        } else if (r.nextDouble() < replies.getDouble("chance", 0.35)) {
            for (Map<?, ?> rule : replies.getMapList("rules")) {
                if (matches(normalized, rule.get("triggers"))) { answers = strings(rule.get("answers")); break; }
            }
            named = null;
        }
        if (answers == null || answers.isEmpty()) return;
        String answer = answers.get(r.nextInt(answers.size()));
        FakePlayer speaker = named != null ? named : randomSpeaker(null);
        if (speaker == null) return;
        lastReply = now;
        later(replies, 2, 7, () -> {
            if (plugin.manager().get(speaker.name()) == speaker) say(speaker, answer, player);
        });
    }

    private static boolean matches(String normalized, Object triggers) {
        String padded = " " + normalized + " ";
        for (String trigger : strings(triggers)) {
            if (padded.contains(" " + normalize(trigger) + " ")) return true;
        }
        return false;
    }

    private static List<String> strings(Object value) {
        List<String> out = new ArrayList<>();
        if (value instanceof List<?> list) for (Object o : list) if (o != null) out.add(o.toString());
        return out;
    }

    /** Minuscules, sans accents ni ponctuation (sauf « ? ») : « Ça va ?! » → « ca va ? ». */
    static String normalize(String text) {
        String s = Normalizer.normalize(text.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return NON_WORD.matcher(s.replace("?", " ? ")).replaceAll(" ").trim();
    }

    private void say(FakePlayer speaker, String message, String player) {
        String text = message.replace("<player>", player == null ? "" : player).trim();
        if (text.isEmpty()) return;
        lastSpeaker = speaker.name();
        plugin.manager().chat(speaker, text);
    }

    private FakePlayer randomSpeaker(String exclude) {
        List<FakePlayer> candidates = new ArrayList<>();
        for (FakePlayer f : plugin.manager().all()) {
            if (!f.leaving() && !f.name().equals(exclude) && !f.name().equals(lastSpeaker)) candidates.add(f);
        }
        if (candidates.isEmpty()) {
            for (FakePlayer f : plugin.manager().all()) if (!f.leaving()) candidates.add(f);
        }
        return candidates.isEmpty() ? null : candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    /** Message au hasard, en évitant les noRepeat derniers envoyés. */
    private String pickFresh(List<String> pool, int noRepeat) {
        if (pool.isEmpty()) return null;
        List<String> fresh = new ArrayList<>(pool);
        fresh.removeAll(recent);
        if (fresh.isEmpty()) fresh = pool;
        String pick = fresh.get(ThreadLocalRandom.current().nextInt(fresh.size()));
        recent.addLast(pick);
        while (recent.size() > Math.max(1, noRepeat)) recent.removeFirst();
        return pick;
    }

    private void later(ConfigurationSection section, int defMin, int defMax, Runnable task) {
        int min = Math.max(0, section.getInt("delay-seconds.min", defMin));
        int max = Math.max(min, section.getInt("delay-seconds.max", defMax));
        long ticks = 20L * (min + ThreadLocalRandom.current().nextInt(max - min + 1)) + 1;
        Bukkit.getScheduler().runTaskLater(plugin, task, ticks);
    }
}
