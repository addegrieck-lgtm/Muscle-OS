package fr.vaeloria.crates.model;

import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.random.RandomGenerator;

/** Un coffre : son nom affiché, l'apparence de sa clé, ses lots et les blocs du monde qui l'ouvrent. */
public final class Crate {
    private final String id;
    private String name;
    private ItemStack key;
    private boolean animation = true;
    private final List<Reward> rewards = new ArrayList<>();
    private final Set<BlockPos> locations = new LinkedHashSet<>();

    public Crate(String id, String name, ItemStack key) {
        this.id = id;
        this.name = name;
        this.key = key.clone();
    }

    public String id() { return id; }
    /** Nom avec codes couleur « & ». */
    public String name() { return name; }
    public void name(String name) { this.name = name; }
    /** Apparence de la clé, sans le marqueur qui l'authentifie (ajouté à la distribution). */
    public ItemStack key() { return key.clone(); }
    public void key(ItemStack key) { this.key = key.clone(); }
    public boolean animation() { return animation; }
    public void animation(boolean animation) { this.animation = animation; }
    public List<Reward> rewards() { return rewards; }
    public Set<BlockPos> locations() { return locations; }

    public long totalWeight() {
        return Weighted.total(rewards, Reward::weight);
    }

    public Reward roll(RandomGenerator random) {
        return Weighted.pick(rewards, Reward::weight, random);
    }
}
