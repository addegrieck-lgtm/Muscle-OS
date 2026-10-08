package fr.vaeloria.factions.service;

import fr.vaeloria.factions.model.Faction;
import fr.vaeloria.factions.util.Msg;
import fr.vaeloria.factions.util.Settings;
import org.bukkit.Bukkit;
import org.bukkit.entity.HumanEntity;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemStack;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.logging.Logger;

/** Coffre partagé de faction : un seul inventaire par faction, vu en direct par tous les membres qui l'ouvrent. */
public final class ChestService {
    private final Settings settings;
    private final Logger log;

    public ChestService(Settings settings, Logger log) {
        this.settings = settings;
        this.log = log;
    }

    public static final class Holder implements InventoryHolder {
        public final String factionId;
        private Inventory inventory;

        Holder(String factionId) { this.factionId = factionId; }

        @Override
        public @NotNull Inventory getInventory() { return inventory; }
    }

    public Inventory open(Faction f, int rows) {
        if (f.chestInventory != null && f.chestInventory.getSize() != rows * 9) resize(f);
        if (f.chestInventory == null) {
            Holder h = new Holder(f.id);
            Inventory inv = Bukkit.createInventory(h, rows * 9, Msg.get("chest.title", "faction", f.name));
            h.inventory = inv;
            if (f.chest != null) {
                for (int i = 0; i < f.chest.size(); i++) {
                    String s = f.chest.get(i);
                    if (s == null) continue;
                    try {
                        ItemStack it = ItemStack.deserializeBytes(Base64.getDecoder().decode(s));
                        if (i < inv.getSize()) inv.setItem(i, it);
                        else overflow(f, it);
                    } catch (RuntimeException e) {
                        log.warning("Objet illisible dans le coffre de " + f.name + " (case " + i + ")");
                    }
                }
            }
            f.chestInventory = inv;
        }
        return f.chestInventory;
    }

    /** Si le coffre a été réduit dans la config, les objets en trop ne sont pas perdus : on les garde en fin de liste. */
    private final java.util.Map<String, List<ItemStack>> overflow = new java.util.HashMap<>();

    private void overflow(Faction f, ItemStack it) {
        overflow.computeIfAbsent(f.id, k -> new ArrayList<>()).add(it);
    }

    /** Recopie l'inventaire vivant dans le champ sérialisé. À appeler sur le thread principal avant la sauvegarde. */
    public void encode(Faction f) {
        if (f.chestInventory == null) return;
        List<String> out = new ArrayList<>();
        for (ItemStack it : f.chestInventory.getContents()) out.add(encode(it));
        for (ItemStack it : overflow.getOrDefault(f.id, List.of())) out.add(encode(it));
        f.chest = out;
    }

    private static String encode(ItemStack it) {
        if (it == null || it.getType().isAir() || it.getAmount() <= 0) return null;
        return Base64.getEncoder().encodeToString(it.serializeAsBytes());
    }

    /** Agrandit le coffre (amélioration) : contenu sauvegardé, inventaire recréé à la prochaine ouverture. */
    public void resize(Faction f) {
        if (f.chestInventory == null) return;
        closeAll(f);
        encode(f);
        overflow.remove(f.id);
        f.chestInventory = null;
    }

    public void closeAll(Faction f) {
        if (f.chestInventory == null) return;
        for (HumanEntity h : new ArrayList<>(f.chestInventory.getViewers())) h.closeInventory();
    }
}
