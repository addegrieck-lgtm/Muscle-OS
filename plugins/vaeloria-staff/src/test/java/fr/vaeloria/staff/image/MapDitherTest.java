package fr.vaeloria.staff.image;

import org.junit.jupiter.api.Test;

import java.awt.image.BufferedImage;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MapDitherTest {
    private static final int[] PALETTE = {0x000000, 0xFFFFFF, 0xFF0000};

    @Test
    void exactColorsAndTransparency() {
        int[] argb = {0xFF000000, 0xFFFFFFFF, 0xFFFF0000, 0x00FFFFFF};
        byte[] out = MapDither.convert(argb, 4, 1, PALETTE, 4, true);
        assertEquals(4, out[0]);
        assertEquals(5, out[1]);
        assertEquals(6, out[2]);
        assertEquals(MapDither.TRANSPARENT, out[3]);
    }

    @Test
    void ditheringKeepsAverageBrightness() {
        int n = 64 * 64;
        int[] gray = new int[n];
        java.util.Arrays.fill(gray, 0xFF808080);
        byte[] plain = MapDither.convert(gray, 64, 64, new int[] {0x000000, 0xFFFFFF}, 4, false);
        byte[] dithered = MapDither.convert(gray, 64, 64, new int[] {0x000000, 0xFFFFFF}, 4, true);
        long whitePlain = count(plain, 5), whiteDithered = count(dithered, 5);
        // Sans tramage, tout le gris devient la même couleur ; avec, environ moitié noir / moitié blanc.
        assertEquals(true, whitePlain == 0 || whitePlain == n);
        assertEquals(0.5, whiteDithered / (double) n, 0.05);
    }

    @Test
    void tilesAreCutRowByRow() {
        BufferedImage img = new BufferedImage(256, 128, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < 128; y++) for (int x = 0; x < 256; x++) img.setRGB(x, y, x < 128 ? 0xFF000000 : 0xFFFFFFFF);
        byte[][] tiles = ImageLoader.tiles(img, 2, 1, new int[] {0x000000, 0xFFFFFF}, 4, false);
        assertEquals(2, tiles.length);
        assertEquals(4, tiles[0][128 * 127 + 127]);
        assertEquals(5, tiles[1][0]);
    }

    @Test
    void fitKeepsProportionsCentered() {
        BufferedImage wide = new BufferedImage(400, 100, BufferedImage.TYPE_INT_RGB);
        BufferedImage fitted = ImageLoader.fit(wide, 256, 256);
        assertEquals(256, fitted.getWidth());
        assertEquals(0, fitted.getRGB(128, 0) >>> 24); // bande transparente au-dessus
        assertEquals(255, fitted.getRGB(128, 128) >>> 24); // image au centre
        assertEquals(2, ImageLoader.suggestedRows(new BufferedImage(400, 200, BufferedImage.TYPE_INT_RGB), 4));
    }

    private static long count(byte[] data, int value) {
        long c = 0;
        for (byte b : data) if (b == value) c++;
        return c;
    }
}
