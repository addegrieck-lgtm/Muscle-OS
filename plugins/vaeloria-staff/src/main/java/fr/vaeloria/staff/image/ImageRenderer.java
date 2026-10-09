package fr.vaeloria.staff.image;

import org.bukkit.entity.Player;
import org.bukkit.map.MapCanvas;
import org.bukkit.map.MapRenderer;
import org.bukkit.map.MapView;

/** Dessine une tuile déjà convertie ; une seule fois, le canevas (partagé entre joueurs) la garde ensuite. */
public final class ImageRenderer extends MapRenderer {
    private final byte[] pixels;
    private boolean drawn;

    public ImageRenderer(byte[] pixels) {
        super(false);
        this.pixels = pixels;
    }

    @Override
    @SuppressWarnings("deprecation")
    public void render(MapView map, MapCanvas canvas, Player player) {
        if (drawn) return;
        for (int y = 0; y < 128; y++) {
            for (int x = 0; x < 128; x++) canvas.setPixel(x, y, pixels[y * 128 + x]);
        }
        drawn = true;
    }
}
