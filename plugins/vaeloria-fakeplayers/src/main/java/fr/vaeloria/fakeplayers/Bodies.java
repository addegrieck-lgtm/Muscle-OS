package fr.vaeloria.fakeplayers;

import com.destroystokyo.paper.profile.ProfileProperty;
import io.papermc.paper.datacomponent.item.ResolvableProfile;
import net.kyori.adventure.text.Component;
import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.NamespacedKey;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Mannequin;
import org.bukkit.entity.Player;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.Plugin;
import org.bukkit.util.Vector;

/**
 * Corps visibles dans le monde, basés sur l'entité Mannequin (Minecraft 1.21.9+) : skin de joueur,
 * aucune connexion simulée, aucun NMS. Cette classe n'est chargée que si le serveur connaît Mannequin.
 */
final class Bodies {
    private final NamespacedKey key;
    private final boolean invulnerable;

    Bodies(Plugin plugin, boolean invulnerable) {
        this.key = new NamespacedKey(plugin, "fake_player");
        this.invulnerable = invulnerable;
    }

    static boolean supported() {
        try {
            Class.forName("org.bukkit.entity.Mannequin");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    void spawn(FakePlayer fake, Location at) {
        despawn(fake);
        fake.bodyLocation(at);
        if (!at.isChunkLoaded()) return; // réapparaîtra quand le tronçon sera chargé (voir tick)
        Mannequin body = at.getWorld().spawn(at, Mannequin.class, m -> {
            ResolvableProfile.Builder profile = ResolvableProfile.resolvableProfile().name(fake.name());
            FakePlayer.Skin skin = fake.skin();
            if (skin != null) profile.addProperty(new ProfileProperty("textures", skin.value(), skin.signature()));
            m.setProfile(profile.build());
            m.customName(Component.text(fake.name()));
            m.setCustomNameVisible(true);
            m.setDescription(null);
            m.setInvulnerable(invulnerable);
            m.setPersistent(false); // jamais sauvegardé dans le monde : recréé depuis fakes.yml
            m.setRemoveWhenFarAway(false);
            m.getPersistentDataContainer().set(key, PersistentDataType.STRING, fake.name());
        });
        fake.bodyId(body.getUniqueId());
    }

    void despawn(FakePlayer fake) {
        Entity body = entity(fake);
        if (body != null) body.remove();
        fake.bodyId(null);
    }

    /** Appelé chaque seconde : recrée les corps perdus (tronçon déchargé) et oriente la tête vers le joueur proche. */
    void tick(FakePlayer fake, boolean lookAtPlayers) {
        if (!fake.hasBody()) return;
        Entity body = entity(fake);
        if (body == null) {
            Location at = fake.bodyLocation();
            if (at.getWorld() != null && at.isChunkLoaded()) spawn(fake, at);
            return;
        }
        fake.bodyLocation(body.getLocation());
        if (!lookAtPlayers) return;
        Player nearest = null;
        double best = 64; // 8 blocs
        for (Player p : body.getWorld().getPlayers()) {
            double d = p.getLocation().distanceSquared(body.getLocation());
            if (d < best) { best = d; nearest = p; }
        }
        if (nearest == null) return;
        Vector dir = nearest.getEyeLocation().toVector().subtract(body.getLocation().add(0, 1.62, 0).toVector());
        Location look = body.getLocation().setDirection(dir);
        body.setRotation(look.getYaw(), look.getPitch());
    }

    boolean isBody(Entity entity) {
        return entity.getPersistentDataContainer().has(key, PersistentDataType.STRING);
    }

    private static Entity entity(FakePlayer fake) {
        if (fake.bodyId() == null) return null;
        Entity e = Bukkit.getEntity(fake.bodyId());
        return e != null && e.isValid() ? e : null;
    }
}
