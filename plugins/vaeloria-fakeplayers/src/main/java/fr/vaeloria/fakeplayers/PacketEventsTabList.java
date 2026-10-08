package fr.vaeloria.fakeplayers;

import com.github.retrooper.packetevents.PacketEvents;
import com.github.retrooper.packetevents.manager.player.PlayerManager;
import com.github.retrooper.packetevents.protocol.player.GameMode;
import com.github.retrooper.packetevents.protocol.player.TextureProperty;
import com.github.retrooper.packetevents.protocol.player.UserProfile;
import com.github.retrooper.packetevents.wrapper.PacketWrapper;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerPlayerInfoRemove;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerPlayerInfoUpdate;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerPlayerInfoUpdate.Action;
import com.github.retrooper.packetevents.wrapper.play.server.WrapperPlayServerPlayerInfoUpdate.PlayerInfo;
import net.kyori.adventure.text.Component;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;

/** Ajoute de vraies entrées joueur (pseudo, skin, ping) dans la liste TAB via le plugin PacketEvents. */
final class PacketEventsTabList implements TabList {
    private final Function<FakePlayer, Component> displayName;

    PacketEventsTabList(Function<FakePlayer, Component> displayName) {
        this.displayName = displayName;
    }

    @Override
    public void show(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {
        if (fakes.isEmpty()) return;
        EnumSet<Action> actions = EnumSet.of(Action.ADD_PLAYER, Action.UPDATE_LISTED, Action.UPDATE_LATENCY,
                Action.UPDATE_GAME_MODE, Action.UPDATE_DISPLAY_NAME);
        send(viewers, () -> new WrapperPlayServerPlayerInfoUpdate(actions, entries(fakes)));
    }

    @Override
    public void hide(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {
        if (fakes.isEmpty()) return;
        List<java.util.UUID> ids = fakes.stream().map(FakePlayer::uuid).toList();
        send(viewers, () -> new WrapperPlayServerPlayerInfoRemove(ids));
    }

    @Override
    public void updateLatency(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {
        if (fakes.isEmpty()) return;
        send(viewers, () -> new WrapperPlayServerPlayerInfoUpdate(EnumSet.of(Action.UPDATE_LATENCY), entries(fakes)));
    }

    private List<PlayerInfo> entries(Collection<FakePlayer> fakes) {
        List<PlayerInfo> entries = new ArrayList<>(fakes.size());
        for (FakePlayer fake : fakes) {
            List<TextureProperty> textures = new ArrayList<>(1);
            FakePlayer.Skin skin = fake.skin();
            if (skin != null) textures.add(new TextureProperty("textures", skin.value(), skin.signature()));
            UserProfile profile = new UserProfile(fake.uuid(), fake.name(), textures);
            entries.add(new PlayerInfo(profile, true, fake.ping(), GameMode.SURVIVAL, displayName.apply(fake), null));
        }
        return entries;
    }

    /** Un paquet neuf par destinataire : PacketEvents écrit le tampon à l'envoi. */
    private static void send(Collection<? extends Player> viewers, Supplier<PacketWrapper<?>> packet) {
        PlayerManager manager = PacketEvents.getAPI().getPlayerManager();
        for (Player viewer : viewers) manager.sendPacket(viewer, packet.get());
    }
}
