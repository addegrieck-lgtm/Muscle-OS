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
    /** Pseudos des faux joueurs présents (hors départs annoncés), lisible depuis n'importe quel thread. */
    private volatile List<String> namesSnapshot = List.of();
    /** Bots du spawn : prévenus d'un départ (avant le retrait de l'entrée TAB) et d'un nouveau skin. */
    private java.util.function.Consumer<FakePlayer> onRemove = f -> {}, onSkin = f -> {};
    private TabList tab = TabList.NONE;
    private Bodies bodies;
    private final SkinFetcher skins;
    private final SkinPool pool;

    FakePlayerManager(FakePlayersPlugin plugin) {
        this.plugin = plugin;
        this.skins = new SkinFetcher(plugin.getLogger());
        this.pool = new SkinPool(new java.io.File(plugin.getDataFolder(), "skin-pool.yml"), plugin.getLogger());
    }

    void services(TabList tab, Bodies bodies) {
        this.tab = tab;
        this.bodies = bodies;
    }

    Bodies bodies() { return bodies; }

    void listeners(java.util.function.Consumer<FakePlayer> onRemove, java.util.function.Consumer<FakePlayer> onSkin) {
        this.onRemove = onRemove;
        this.onSkin = onSkin;
    }

    public Collection<FakePlayer> all() { return List.copyOf(fakes.values()); }

    public int count() { return fakes.size(); }

    /** Copie immuable des pseudos, utilisable hors du thread principal (auto-complétion asynchrone). */
    public List<String> namesSnapshot() { return namesSnapshot; }

    void refreshSnapshot() {
        namesSnapshot = fakes.values().stream().filter(f -> !f.leaving()).map(FakePlayer::name).toList();
    }

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
        FakePlayer fake = new FakePlayer(name, auto, PingModel.base(name));
        fake.listed(fakes.size() < tabSlots());
        // Skin de la réserve tout de suite : l'entrée TAB (et le corps au spawn) apparaît directement avec.
        if (!skinSource().equals("mojang")) {
            Set<String> worn = new HashSet<>();
            for (FakePlayer f : fakes.values()) if (f.skin() != null) worn.add(f.skin().signature());
            FakePlayer.Skin s = pool.pick(name, worn);
            if (s != null) fake.skin(s);
        }
        fakes.put(name.toLowerCase(Locale.ROOT), fake);
        refreshSnapshot();
        if (bodyAt != null && bodies != null) bodies.spawn(fake, bodyAt);
        tab.show(List.of(fake), Bukkit.getOnlinePlayers());
        if (!silent) broadcast("messages.join", fake);
        fetchSkin(fake);
        return fake;
    }

    public boolean remove(String name, boolean silent) {
        FakePlayer fake = fakes.remove(name.toLowerCase(Locale.ROOT));
        if (fake == null) return false;
        refreshSnapshot();
        if (bodies != null) bodies.despawn(fake);
        onRemove.accept(fake); // l'entité visible au spawn disparaît avant l'entrée TAB
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
        // <name> remplacé dans le texte du format : il peut ainsi servir aussi dans <click:…> et <hover:…>
        // (pseudo validé : lettres, chiffres et _ uniquement, aucune balise possible).
        Bukkit.broadcast(MM.deserialize(format.replace("<name>", fake.name()), Placeholder.unparsed("message", message)));
    }

    /** Envoie toutes les entrées TAB à un joueur qui vient de se connecter. */
    void showAllTo(Player viewer) {
        tab.show(all(), List.of(viewer));
    }

    /** Places du TAB pour les faux joueurs (tab.max-listed, et la limite de VaeloriaTab s'il est installé). */
    private int tabSlots() {
        int configured = plugin.getConfig().getInt("tab.max-listed", 0);
        int slots = VaeloriaTabHook.fakeSlots();
        return configured > 0 ? Math.min(configured, slots) : slots;
    }

    /**
     * Ne montre dans le TAB que les faux joueurs qui ont une place (les plus anciens d'abord) ; les autres restent
     * connectés et comptés. Évite qu'un TAB trop rempli cache de vrais joueurs (Minecraft n'affiche que 80 noms).
     */
    void applyTabLimit() {
        int slots = tabSlots(), index = 0;
        List<FakePlayer> changed = new ArrayList<>();
        for (FakePlayer fake : fakes.values()) {
            boolean listed = index++ < slots;
            if (fake.listed() != listed) {
                fake.listed(listed);
                changed.add(fake);
            }
        }
        tab.updateListed(changed, Bukkit.getOnlinePlayers());
    }

    /** Chaque seconde : corps (réapparition, regard) ; toutes les 5 s : ping (fluctuations et pics de lag). */
    void tick(long seconds) {
        if (seconds % 5 == 0) applyTabLimit();
        boolean look = plugin.getConfig().getBoolean("bodies.look-at-players", true);
        if (bodies != null) for (FakePlayer fake : fakes.values()) bodies.tick(fake, look);
        if (seconds % 5 == 0 && !fakes.isEmpty()) {
            java.util.Random random = ThreadLocalRandom.current();
            for (FakePlayer fake : fakes.values()) {
                int[] next = PingModel.next(fake.basePing(), fake.spikeLeft(), random);
                fake.ping(next[0]);
                fake.spikeLeft(next[1]);
            }
            tab.updateLatency(all(), Bukkit.getOnlinePlayers());
        }
    }

    Component render(String path, FakePlayer fake) {
        String format = plugin.getConfig().getString(path, "");
        return format.isEmpty() ? null : MM.deserialize(format.replace("<name>", fake.name()));
    }

    private void broadcast(String path, FakePlayer fake) {
        Component message = render(path, fake);
        if (message != null) Bukkit.broadcast(message);
    }

    /** pool (réserve MineSkin, par défaut), mojang (compte qui porte le pseudo), both (compte s'il existe, sinon réserve). */
    private String skinSource() {
        return plugin.getConfig().getString("skins.source", "pool").toLowerCase(Locale.ROOT);
    }

    /** Complète la réserve de skins en arrière-plan (appelé au démarrage puis toutes les heures). */
    void fillSkinPool() {
        if (skinSource().equals("mojang")) return;
        int target = plugin.getConfig().getInt("skins.pool-size", 400);
        String key = plugin.getConfig().getString("skins.mineskin-api-key", "");
        if (pool.size() < target) Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            pool.fill(target, key);
            Bukkit.getScheduler().runTask(plugin, this::assignMissingSkins);
        });
    }

    /** Faux joueurs connectés avant que la réserve soit prête : ils reçoivent leur skin maintenant. */
    private void assignMissingSkins() {
        Set<String> worn = new HashSet<>();
        for (FakePlayer f : fakes.values()) if (f.skin() != null) worn.add(f.skin().signature());
        for (FakePlayer fake : all()) {
            if (fake.skin() != null) continue;
            FakePlayer.Skin s = pool.pick(fake.name(), worn);
            if (s == null) return;
            worn.add(s.signature());
            fake.skin(s);
            tab.hide(List.of(fake), Bukkit.getOnlinePlayers());
            tab.show(List.of(fake), Bukkit.getOnlinePlayers());
            onSkin.accept(fake);
        }
    }

    int skinPoolSize() { return pool.size(); }

    private void fetchSkin(FakePlayer fake) {
        if (!plugin.getConfig().getBoolean("skins.fetch", true)) return;
        String source = skinSource();
        if (source.equals("pool") && fake.skin() != null) return; // skin de la réserve déjà donné
        if (source.equals("pool") && plugin.getConfig().getStringList("skins.fallback-names").isEmpty()) return;
        List<String> donors = new ArrayList<>(plugin.getConfig().getStringList("skins.fallback-names"));
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            // Le compte qui porte ce pseudo appartient à une vraie personne : seulement si on l'a demandé (mojang/both).
            FakePlayer.Skin skin = source.equals("pool") ? null : skins.fetch(fake.name());
            if (skin == null && source.equals("both") && fake.skin() != null) return; // garde celui de la réserve
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
                onSkin.accept(fake);
                if (fake.hasBody() && bodies != null) bodies.spawn(fake, fake.bodyLocation());
            });
        });
    }
}
