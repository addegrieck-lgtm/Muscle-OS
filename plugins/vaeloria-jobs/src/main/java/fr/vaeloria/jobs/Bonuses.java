package fr.vaeloria.jobs;

import fr.vaeloria.jobs.model.Effect;
import fr.vaeloria.jobs.model.JobProgress;
import fr.vaeloria.jobs.model.PlayerJobs;
import fr.vaeloria.jobs.model.SkillNode;
import org.bukkit.NamespacedKey;
import org.bukkit.Registry;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeInstance;
import org.bukkit.attribute.AttributeModifier;
import org.bukkit.entity.Player;
import org.bukkit.inventory.EquipmentSlotGroup;
import org.bukkit.plugin.Plugin;
import org.bukkit.potion.PotionEffect;
import org.bukkit.potion.PotionEffectType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Applique les nœuds débloqués au joueur avec les mécaniques vanilla :
 * modificateurs d'attributs transitoires (jamais sauvegardés dans le fichier du joueur : retirer le plugin
 * retire les bonus) et effets de potion infinis, discrets (ambiants, sans particules).
 */
final class Bonuses {
    private final Plugin plugin;
    private final String namespace;
    /** Potions voulues par joueur connecté, remises si le lait ou la mort les retire. */
    private final Map<UUID, List<PotionEffect>> potions = new ConcurrentHashMap<>();

    Bonuses(Plugin plugin) {
        this.plugin = plugin;
        this.namespace = new NamespacedKey(plugin, "x").getNamespace();
    }

    /** Recalcule tous les bonus du joueur à partir de ses arbres. */
    void refresh(Player p, PlayerJobs data, Settings s) {
        clearAttributes(p);
        boolean active = s.effectsApplyIn(p.getWorld().getName());
        List<PotionEffect> wanted = new ArrayList<>();
        if (active) {
            Map<PotionEffectType, Integer> best = new HashMap<>();
            for (Settings.Job job : s.jobs().values()) {
                JobProgress progress = data.all().get(job.id());
                if (progress == null) continue;
                for (String id : progress.unlocked()) {
                    SkillNode node = job.tree().node(id);
                    if (node == null) continue;
                    int i = 0;
                    for (Effect e : node.effects()) {
                        i++;
                        if (e.kind() == Effect.Kind.ATTRIBUTE) {
                            addModifier(p, e, new NamespacedKey(plugin, job.id() + "/" + node.id() + "/" + i));
                        } else {
                            PotionEffectType type = Registry.EFFECT.get(NamespacedKey.minecraft(e.key()));
                            if (type != null) best.merge(type, e.amplifier(), Math::max);
                        }
                    }
                }
            }
            best.forEach((type, amp) -> wanted.add(new PotionEffect(type, PotionEffect.INFINITE_DURATION, amp, true, false, true)));
        }

        // Retire nos anciennes potions qui ne sont plus voulues ou plus au même niveau. Elles se reconnaissent
        // à « infinie + ambiante » : les balises et conduits sont ambiants mais limités, /effect n'est pas ambiant.
        for (PotionEffect current : new ArrayList<>(p.getActivePotionEffects())) {
            if (!ours(current)) continue;
            boolean keep = wanted.stream().anyMatch(w -> w.getType().equals(current.getType()) && w.getAmplifier() == current.getAmplifier());
            if (!keep) p.removePotionEffect(current.getType());
        }
        if (wanted.isEmpty()) potions.remove(p.getUniqueId());
        else potions.put(p.getUniqueId(), List.copyOf(wanted));
        applyPotions(p);

        AttributeInstance max = p.getAttribute(Attribute.MAX_HEALTH);
        if (max != null && p.getHealth() > max.getValue()) p.setHealth(max.getValue());
    }

    /** Remet les potions permanentes qui manquent (lait, mort, potion plus faible expirée). */
    void applyPotions(Player p) {
        List<PotionEffect> wanted = potions.get(p.getUniqueId());
        if (wanted == null) return;
        for (PotionEffect w : wanted) {
            PotionEffect current = p.getPotionEffect(w.getType());
            if (current == null || current.getAmplifier() < w.getAmplifier()
                    || (current.getAmplifier() == w.getAmplifier() && !current.isInfinite())) {
                p.addPotionEffect(w);
            }
        }
    }

    void tick(Iterable<? extends Player> online) {
        for (Player p : online) applyPotions(p);
    }

    void forget(UUID uuid) {
        potions.remove(uuid);
    }

    /** Retire tous les bonus (désactivation du plugin). */
    void clear(Player p) {
        clearAttributes(p);
        for (PotionEffect current : new ArrayList<>(p.getActivePotionEffects())) {
            if (ours(current)) p.removePotionEffect(current.getType());
        }
        potions.remove(p.getUniqueId());
    }

    private void addModifier(Player p, Effect e, NamespacedKey key) {
        Attribute attribute = Registry.ATTRIBUTE.get(NamespacedKey.minecraft(e.key()));
        if (attribute == null) return;
        AttributeInstance inst = p.getAttribute(attribute);
        if (inst == null) return;
        AttributeModifier.Operation op = switch (e.operation()) {
            case ADD -> AttributeModifier.Operation.ADD_NUMBER;
            case MULTIPLY_BASE -> AttributeModifier.Operation.ADD_SCALAR;
            case MULTIPLY_TOTAL -> AttributeModifier.Operation.MULTIPLY_SCALAR_1;
        };
        inst.addTransientModifier(new AttributeModifier(key, e.amount(), op, EquipmentSlotGroup.ANY));
    }

    private void clearAttributes(Player p) {
        for (Attribute attribute : Registry.ATTRIBUTE) {
            AttributeInstance inst = p.getAttribute(attribute);
            if (inst == null) continue;
            for (AttributeModifier m : new ArrayList<>(inst.getModifiers())) {
                if (namespace.equals(m.getKey().getNamespace())) inst.removeModifier(m);
            }
        }
    }

    private static boolean ours(PotionEffect e) {
        return e.isInfinite() && e.isAmbient();
    }
}
