package fr.vaeloria.echanges;

import fr.vaeloria.echanges.model.Forbidden;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.Material;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.ArrayList;
import java.util.List;

/** Œuf de capture et villageois capturé. Reconnus par leur marqueur invisible, jamais par leur nom. */
public final class Items {
    private final VaeloriaEchangesPlugin plugin;

    public Items(VaeloriaEchangesPlugin plugin) { this.plugin = plugin; }

    public ItemStack captureEgg(int amount) {
        ItemStack egg = new ItemStack(Material.EGG, amount);
        egg.editMeta(meta -> {
            meta.displayName(Text.of("&a&lŒuf de capture"));
            meta.lore(List.of(
                    Text.of("&7Lance-le sur un villageois pour le capturer."),
                    Text.of("&7Relâché, il repart au niveau 1, &csans livre&7,"),
                    Text.of("&7et ne reproposera jamais ses anciens livres.")));
            meta.setEnchantmentGlintOverride(true);
            meta.getPersistentDataContainer().set(plugin.keys().captureEgg, PersistentDataType.BYTE, (byte) 1);
        });
        return egg;
    }

    public boolean isCaptureEgg(ItemStack it) {
        return it != null && it.getType() == Material.EGG && it.hasItemMeta()
                && it.getItemMeta().getPersistentDataContainer().has(plugin.keys().captureEgg);
    }

    public boolean isCaptured(ItemStack it) {
        return it != null && it.hasItemMeta()
                && it.getItemMeta().getPersistentDataContainer().has(plugin.keys().capturedProfession);
    }

    /** Œuf de villageois portant le métier, le biome d'origine, le nom et les livres désormais interdits. */
    public ItemStack captured(Villager v, String forbidden) {
        ItemStack it = new ItemStack(Material.VILLAGER_SPAWN_EGG);
        ItemMeta meta = it.getItemMeta();
        String profession = v.getProfession().getKey().getKey();
        meta.displayName(Text.of("&aVillageois capturé &7— &f" + Professions.name(profession)));
        List<Component> lore = new ArrayList<>();
        if (v.customName() != null) lore.add(Text.of("&7Nom : &f").append(v.customName()));
        lore.add(Text.of("&7Clic droit sur un bloc pour le relâcher."));
        lore.add(Text.of("&7Il repartira au niveau 1, &csans livre &7: booste-le à l'émeraude."));
        List<String> ids = new ArrayList<>(Forbidden.parse(forbidden));
        if (!ids.isEmpty()) {
            lore.add(Text.of("&7Ne proposera plus jamais :"));
            for (String id : ids) lore.add(Text.of("&8 • &c" + Books.nameOfId(id)));
        }
        meta.lore(lore);
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(plugin.keys().capturedProfession, PersistentDataType.STRING, v.getProfession().getKey().toString());
        pdc.set(plugin.keys().capturedType, PersistentDataType.STRING, v.getVillagerType().getKey().toString());
        pdc.set(plugin.keys().capturedForbidden, PersistentDataType.STRING, forbidden);
        if (v.customName() != null) pdc.set(plugin.keys().capturedName, PersistentDataType.STRING, GsonComponentSerializer.gson().serialize(v.customName()));
        it.setItemMeta(meta);
        return it;
    }
}
