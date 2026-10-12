package fr.vaeloria.villageois;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Particle;
import org.bukkit.Registry;
import org.bukkit.Sound;
import org.bukkit.damage.DamageSource;
import org.bukkit.damage.DamageType;
import org.bukkit.entity.Player;
import org.bukkit.entity.Villager;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;

import java.util.List;
import java.util.UUID;

/**
 * Œuf de capture et villageois capturé. Le villageois relâché ne garde que son apparence (biome) et son nom :
 * pas ses échanges ni sa chance. Il reprend un métier près d'un poste de travail, avec de nouveaux livres.
 */
final class Capture {
    private final Keys keys;

    Capture(Keys keys) {
        this.keys = keys;
    }

    ItemStack egg(int amount) {
        ItemStack item = new ItemStack(Material.EGG, amount);
        ItemMeta meta = item.getItemMeta();
        meta.displayName(Text.item("<ruby_hi>Œuf de capture"));
        meta.lore(List.of(
                Text.item("<silver>Lance-le sur un villageois pour l'emporter."),
                Text.item("<ash>Relâché, il oublie ses échanges et sa chance :"),
                Text.item("<ash>il faudra le rebooster pour retrouver un bon livre.")));
        meta.setEnchantmentGlintOverride(true);
        meta.getPersistentDataContainer().set(keys.captureEgg, PersistentDataType.BOOLEAN, true);
        item.setItemMeta(meta);
        return item;
    }

    boolean isEgg(ItemStack item) {
        return item != null && item.getType() == Material.EGG && item.hasItemMeta()
                && item.getItemMeta().getPersistentDataContainer().has(keys.captureEgg);
    }

    boolean isCaptured(ItemStack item) {
        return item != null && item.hasItemMeta() && item.getItemMeta().getPersistentDataContainer().has(keys.capturedType);
    }

    /**
     * Le joueur pourrait-il frapper ce villageois ? Les plugins de protection (claims de faction…) répondent.
     * Événement sondé sans dégâts : le constructeur est marqué interne par Paper, mais c'est la seule façon
     * de demander à tous les plugins de protection à la fois.
     */
    @SuppressWarnings("removal")
    static boolean canTouch(Player player, Villager v) {
        DamageSource source = DamageSource.builder(DamageType.PLAYER_ATTACK).withCausingEntity(player).withDirectEntity(player).build();
        EntityDamageByEntityEvent probe = new EntityDamageByEntityEvent(player, v, EntityDamageEvent.DamageCause.ENTITY_ATTACK, source, 0.0);
        Bukkit.getPluginManager().callEvent(probe);
        return !probe.isCancelled();
    }

    /** PNJ d'autres plugins (Citizens, boutiques) : jamais capturables. */
    static boolean isPluginNpc(Villager v) {
        return v.hasMetadata("NPC") || v.isInvulnerable() || !v.hasAI();
    }

    ItemStack capture(Villager v) {
        ItemStack item = new ItemStack(Material.VILLAGER_SPAWN_EGG);
        ItemMeta meta = item.getItemMeta();
        Villager.Profession job = v.getProfession();
        meta.displayName(Text.item(v.customName() != null
                ? "<gold>Villageois capturé <ash>·</ash> <snow>" + Text.esc(Text.plain(v.customName()))
                : "<gold>Villageois capturé"));
        meta.lore(List.of(
                Text.item("<silver>Ancien métier : <snow><lang:entity.minecraft.villager." + job.getKey().getKey() + ">"),
                Text.item("<steel>Clic droit sur un bloc pour le relâcher."),
                Text.item("<ash>Ses échanges sont perdus : il prendra un métier"),
                Text.item("<ash>près d'un poste de travail, avec de nouveaux livres.")));
        meta.addItemFlags(ItemFlag.HIDE_ADDITIONAL_TOOLTIP);
        meta.setMaxStackSize(1);
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(keys.capturedType, PersistentDataType.STRING, v.getVillagerType().getKey().toString());
        pdc.set(keys.capturedProfession, PersistentDataType.STRING, job.getKey().toString());
        if (v.customName() != null) pdc.set(keys.capturedName, PersistentDataType.STRING, GsonComponentSerializer.gson().serialize(v.customName()));
        pdc.set(keys.capturedId, PersistentDataType.STRING, UUID.randomUUID().toString());
        item.setItemMeta(meta);

        Location at = v.getLocation().add(0, 1, 0);
        v.getWorld().spawnParticle(Particle.CLOUD, at, 25, 0.3, 0.5, 0.3, 0.05);
        v.getWorld().playSound(at, Sound.ENTITY_ITEM_PICKUP, 1f, 0.6f);
        v.remove();
        return item;
    }

    /** Relâche le villageois : sans métier (sauf idiot du village), donc sans échanges ni chance. */
    Villager release(ItemStack item, Location at) {
        PersistentDataContainer pdc = item.getItemMeta().getPersistentDataContainer();
        Villager.Type type = lookup(Registry.VILLAGER_TYPE, pdc.get(keys.capturedType, PersistentDataType.STRING), Villager.Type.PLAINS);
        Villager.Profession old = lookup(Registry.VILLAGER_PROFESSION, pdc.get(keys.capturedProfession, PersistentDataType.STRING), Villager.Profession.NONE);
        String name = pdc.get(keys.capturedName, PersistentDataType.STRING);
        Component customName = name == null ? null : GsonComponentSerializer.gson().deserialize(name);
        Villager v = at.getWorld().spawn(at, Villager.class, spawned -> {
            spawned.setVillagerType(type);
            spawned.setProfession(old == Villager.Profession.NITWIT ? Villager.Profession.NITWIT : Villager.Profession.NONE);
            spawned.setVillagerLevel(1);
            spawned.setVillagerExperience(0);
            if (customName != null) spawned.customName(customName);
        });
        at.getWorld().spawnParticle(Particle.HAPPY_VILLAGER, at.clone().add(0, 1, 0), 20, 0.3, 0.5, 0.3, 0);
        at.getWorld().playSound(at, Sound.ENTITY_VILLAGER_YES, 1f, 1f);
        return v;
    }

    private static <T extends org.bukkit.Keyed> T lookup(Registry<T> registry, String key, T fallback) {
        NamespacedKey k = key == null ? null : NamespacedKey.fromString(key);
        T value = k == null ? null : registry.get(k);
        return value == null ? fallback : value;
    }
}
