package fr.vaeloria.fakeplayers;

import org.bukkit.entity.Player;

import java.util.Collection;

/** Entrées de la liste TAB. L'implémentation réelle passe par PacketEvents ; sinon {@link #NONE}. */
public interface TabList {
    void show(Collection<FakePlayer> fakes, Collection<? extends Player> viewers);

    void hide(Collection<FakePlayer> fakes, Collection<? extends Player> viewers);

    void updateLatency(Collection<FakePlayer> fakes, Collection<? extends Player> viewers);

    TabList NONE = new TabList() {
        public void show(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {}
        public void hide(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {}
        public void updateLatency(Collection<FakePlayer> fakes, Collection<? extends Player> viewers) {}
    };
}
