package fr.vaeloria.crates.model;

import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;

/**
 * Un lot : l'objet exact déposé par l'admin (enchantements, nom, lore compris), son poids de tirage
 * et des commandes console facultatives ({player}, {uuid}).
 * Si {@code giveItem} est faux, l'objet ne sert que d'icône et seules les commandes sont exécutées.
 */
public final class Reward {
    private ItemStack item;
    private int weight;
    private boolean giveItem = true;
    private boolean broadcast = false;
    private final List<String> commands = new ArrayList<>();

    public Reward(ItemStack item, int weight) {
        this.item = item.clone();
        this.weight = weight;
    }

    public ItemStack item() { return item.clone(); }
    public void item(ItemStack item) { this.item = item.clone(); }
    public int weight() { return weight; }
    public void weight(int weight) { this.weight = Math.max(0, Math.min(1_000_000, weight)); }
    public boolean giveItem() { return giveItem; }
    public void giveItem(boolean giveItem) { this.giveItem = giveItem; }
    public boolean broadcast() { return broadcast; }
    public void broadcast(boolean broadcast) { this.broadcast = broadcast; }
    public List<String> commands() { return commands; }
}
