package fr.vaeloria.crates.gui;

import fr.vaeloria.crates.VaeloriaCratesPlugin;
import fr.vaeloria.crates.model.Crate;
import fr.vaeloria.crates.model.Reward;
import fr.vaeloria.crates.util.Items;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.Sound;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.scheduler.BukkitTask;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Roulette d'ouverture. Le lot est tiré AVANT l'animation (qui n'est qu'un affichage) et il est remis
 * quoi qu'il arrive : fermeture du menu, déconnexion ou arrêt du serveur.
 */
public final class RollAnimation extends Menu {
    private static final int CENTER = 13;

    private final VaeloriaCratesPlugin plugin;
    private final Crate crate;
    private final Reward winner;
    private final List<Integer> shiftTicks = new ArrayList<>();
    private final List<Reward> strip = new ArrayList<>();
    private BukkitTask task;
    private int tick;
    private int offset;
    private boolean finished;

    public RollAnimation(VaeloriaCratesPlugin plugin, Player viewer, Crate crate, Reward winner) {
        super(viewer, 3, crate.name());
        this.plugin = plugin;
        this.crate = crate;
        this.winner = winner;

        // Défilement qui ralentit : 1 tick entre deux cases au début, jusqu'à 6 à la fin.
        int duration = Math.max(20, plugin.getConfig().getInt("animation-ticks", 60));
        for (int t = 0; t < duration; ) {
            double progress = (double) t / duration;
            t += 1 + (int) (5 * progress * progress);
            shiftTicks.add(t);
        }
        ThreadLocalRandom random = ThreadLocalRandom.current();
        int length = shiftTicks.size() + 9;
        for (int i = 0; i < length; i++) strip.add(crate.roll(random));
        strip.set(shiftTicks.size() + 4, winner); // la case centrale de la dernière position
    }

    @Override
    protected void render() {
        for (int i = 0; i < 9; i++) {
            set(9 + i, strip.get(offset + i).item());
        }
        set(4, Items.icon(Material.HOPPER, "&e▼"));
        set(22, Items.icon(Material.HOPPER, "&e▲"));
        fillEmpty();
    }

    public void start() {
        plugin.rolling().put(viewer.getUniqueId(), this);
        open();
        task = Bukkit.getScheduler().runTaskTimer(plugin, this::step, 1L, 1L);
    }

    private void step() {
        tick++;
        if (offset < shiftTicks.size()) {
            if (tick >= shiftTicks.get(offset)) {
                offset++;
                redraw();
                viewer.playSound(viewer.getLocation(), Sound.UI_BUTTON_CLICK, 0.4f, 1.6f);
            }
            return;
        }
        if (tick >= shiftTicks.get(shiftTicks.size() - 1) + 30) {
            finish();
            viewer.closeInventory();
        } else if (tick == shiftTicks.get(shiftTicks.size() - 1) + 1) {
            ItemStack shown = Items.withLore(winner.item(), List.of("", "&a&lGAGNÉ !"));
            set(CENTER, shown);
            viewer.playSound(viewer.getLocation(), Sound.ENTITY_PLAYER_LEVELUP, 0.8f, 1.2f);
        }
    }

    /** Remet le lot (une seule fois) et arrête l'animation. */
    public void finish() {
        if (finished) return;
        finished = true;
        if (task != null) task.cancel();
        plugin.rolling().remove(viewer.getUniqueId());
        plugin.grant(viewer, crate, winner);
    }

    @Override
    public void onClose() {
        finish();
    }
}
