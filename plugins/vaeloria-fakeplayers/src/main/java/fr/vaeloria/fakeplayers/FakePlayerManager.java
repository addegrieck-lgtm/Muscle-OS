package fr.vaeloria.fakeplayers;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.minimessage.MiniMessage;
import net.kyori.adventure.text.minimessage.tag.resolver.Placeholder;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

/** État des faux joueurs. À n'utiliser que depuis le thread principal (sauf la recherche de skin, asynchrone). */
public final class FakePlayerManager {
    private static final MiniMessage MM = MiniMessage.miniMessage();

    private final FakePlayersPlugin plugin;
    private final Map<String, FakePlayer> fakes = new LinkedHashMap<>();
    private TabList tab = TabList.NONE;
    private Bodies bodies;
    private final SkinFetcher skins;

    FakePlayerManager(FakePlayersPlugin plugin) {
        this.plugin = plugin;
        this.skins = new SkinFetcher(plugin.getLogger());
    }

    void services(TabList tab, Bodies bodies) {
        this.tab = tab;
        this.bodies = bodies;
    }

    Bodies bodies() { return bodies; }

    public Collection<FakePlayer> all() { return List.copyOf(fakes.values()); }

    public int count() { return fakes.size(); }

    public FakePlayer get(String name) { return name == null ? null : fakes.get(name.toLowerCase(Locale.ROOT)); }

    /** Pseudos (minuscules) déjà pris par un vrai joueur connecté ou un faux joueur. */
    public Set<String> takenNames() {
        Set<String> taken = new HashSet<>(fakes.keySet());
        for (Player p : Bukkit.getOnlinePlayers()) taken.add(p.getName().toLowerCase(Locale.ROOT));
        return taken;
    }

    /**
     * Fait « rejoindre » un faux joueur. Le skin est cherché en asynchrone puis appliqué à l'entrée TAB et au corps.
     * @param bodyAt position du corps, ou null pour un joueur présent uniquement dans le TAB / le compteur
     */
    public FakePlayer spawn(String name, boolean auto, Location bodyAt, boolean silent) {
        if (!NamePool.isValid(name) || takenNames().contains(name.toLowerCase(Locale.ROOT))) return null;
        FakePlayer fake = new FakePlayer(name, auto, randomPing());
        fakes.put(name.toLowerCase(Locale.ROOT), fake);
        if (bodyAt != null && bodies != null) bodies.spawn(fake, bodyAt);
        tab.show(List.of(fake), Bukkit.getOnlinePlayers());
        if (!silent) broadcast("messages.join", fake);
        fetchSkin(fake);
        return fake;
    }

    public boolean remove(String name, boolean silent) {
        FakePlayer fake = fakes.remove(name.toLowerCase(Locale.ROOT));
        if (fake == null) return false;
        if (bodies != null) bodies.despawn(fake);
        tab.hide(List.of(fake), Bukkit.getOnlinePlayers());
        if (!silent) broadcast("messages.quit", fake);
        return true;
    }

    public void removeAll(boolean silent) {
        for (FakePlayer fake : all()) remove(fake.name(), silent);
    }

    public void moveBody(FakePlayer fake, Location at) {
        if (bodies != null) bodies.spawn(fake, at);
    }

    public void chat(FakePlayer fake, String message) {
        String format = plugin.getConfig().getString("chat.format", "<gray><name></gray> <dark_gray>»</dark_gray> <message>");
        Bukkit.broadcast(MM.deserialize(format, Placeholder.unparsed("name", fake.name()),
                Placeholder.unparsed("message", message)));
    }

    /** Envoie toutes les entrées TAB à un joueur qui vient de se connecter. */
    void showAllTo(Player viewer) {
        tab.show(all(), List.of(viewer));
    }

    /** Chaque seconde : corps (réapparition, regard) ; toutes les 10 s : variation du ping. */
    void tick(long seconds) {
        boolean look = plugin.getConfig().getBoolean("bodies.look-at-players", true);
        if (bodies != null) for (FakePlayer fake : fakes.values()) bodies.tick(fake, look);
        if (seconds % 10 == 0 && !fakes.isEmpty()) {
            int min = plugin.getConfig().getInt("tab.ping.min", 15), max = plugin.getConfig().getInt("tab.ping.max", 90);
            for (FakePlayer fake : fakes.values()) {
                int drift = ThreadLocalRandom.current().nextInt(-8, 9);
                fake.ping(Math.max(min, Math.min(max, fake.ping() + drift)));
            }
            tab.updateLatency(all(), Bukkit.getOnlinePlayers());
        }
    }

    Component render(String path, FakePlayer fake) {
        String format = plugin.getConfig().getString(path, "");
        return format.isEmpty() ? null : MM.deserialize(format, Placeholder.unparsed("name", fake.name()));
    }

    private void broadcast(String path, FakePlayer fake) {
        Component message = render(path, fake);
        if (message != null) Bukkit.broadcast(message);
    }

    private int randomPing() {
        int min = plugin.getConfig().getInt("tab.ping.min", 15), max = plugin.getConfig().getInt("tab.ping.max", 90);
        return ThreadLocalRandom.current().nextInt(min, Math.max(min, max) + 1);
    }

    private void fetchSkin(FakePlayer fake) {
        if (!plugin.getConfig().getBoolean("skins.fetch", true)) return;
        List<String> donors = new ArrayList<>(plugin.getConfig().getStringList("skins.fallback-names"));
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            FakePlayer.Skin skin = skins.fetch(fake.name());
            while (skin == null && !donors.isEmpty()) {
                skin = skins.fetch(donors.remove(ThreadLocalRandom.current().nextInt(donors.size())));
            }
            if (skin == null) return;
            FakePlayer.Skin found = skin;
            Bukkit.getScheduler().runTask(plugin, () -> {
                if (get(fake.name()) != fake) return; // retiré entre-temps
                fake.skin(found);
                // Le client ne relit le skin qu'à l'ajout : on retire puis on ré-ajoute l'entrée.
                tab.hide(List.of(fake), Bukkit.getOnlinePlayers());
                tab.show(List.of(fake), Bukkit.getOnlinePlayers());
                if (fake.hasBody() && bodies != null) bodies.spawn(fake, fake.bodyLocation());
            });
        });
    }
}
