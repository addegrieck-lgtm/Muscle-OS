package fr.vaeloria.staff.image;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.time.Duration;
import java.util.Iterator;

/** Lecture d'une image (lien http(s) ou fichier du dossier images/) et mise à la taille du mur de cadres. */
public final class ImageLoader {
    private ImageLoader() {}

    /** Au-delà, l'image est refusée avant décodage (protection mémoire contre les images piégées). */
    public static final int MAX_SIDE = 8192;

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** À appeler hors du thread principal. */
    public static BufferedImage read(String source, File imagesDir, long maxBytes) throws IOException {
        byte[] data;
        String s = source.trim();
        if (s.startsWith("http://") || s.startsWith("https://")) {
            data = download(s, maxBytes);
        } else {
            File base = imagesDir.getCanonicalFile();
            File file = new File(base, s).getCanonicalFile();
            if (!file.toPath().startsWith(base.toPath())) throw new IOException("Chemin interdit : " + s);
            if (!file.isFile()) throw new IOException("Fichier introuvable dans images/ : " + s);
            if (file.length() > maxBytes) throw new IOException("Fichier trop lourd (" + file.length() / 1_048_576 + " Mo)");
            data = Files.readAllBytes(file.toPath());
        }
        return decode(data);
    }

    private static byte[] download(String url, long maxBytes) throws IOException {
        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new IOException("Lien invalide");
        }
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(20))
                .header("User-Agent", "VaeloriaStaff (Minecraft)").GET().build();
        try {
            HttpResponse<InputStream> response = HTTP.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream in = response.body()) {
                if (response.statusCode() / 100 != 2) throw new IOException("Le site a répondu " + response.statusCode());
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[16_384];
                long total = 0;
                for (int n; (n = in.read(buffer)) > 0; ) {
                    total += n;
                    if (total > maxBytes) throw new IOException("Image trop lourde (max " + maxBytes / 1_048_576 + " Mo)");
                    out.write(buffer, 0, n);
                }
                return out.toByteArray();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Téléchargement interrompu");
        }
    }

    private static BufferedImage decode(byte[] data) throws IOException {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            if (in == null) throw new IOException("Image illisible");
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) throw new IOException("Format non reconnu (PNG, JPEG, GIF ou BMP)");
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                int w = reader.getWidth(0), h = reader.getHeight(0);
                if (w > MAX_SIDE || h > MAX_SIDE) throw new IOException("Image trop grande (" + w + "×" + h + ", max " + MAX_SIDE + " px)");
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        }
    }

    /** Taille du mur conseillée pour {@code cols} cadres de large, en respectant les proportions de l'image. */
    public static int suggestedRows(BufferedImage image, int cols) {
        return Math.max(1, Math.round(cols * image.getHeight() / (float) image.getWidth()));
    }

    /**
     * Redimensionne l'image pour qu'elle tienne entière dans {@code width × height}, centrée,
     * le reste transparent. Réduction par paliers successifs : bien plus net qu'une réduction d'un seul coup.
     */
    public static BufferedImage fit(BufferedImage source, int width, int height) {
        double ratio = Math.min(width / (double) source.getWidth(), height / (double) source.getHeight());
        int w = Math.max(1, (int) Math.round(source.getWidth() * ratio));
        int h = Math.max(1, (int) Math.round(source.getHeight() * ratio));
        BufferedImage current = toArgb(source);
        while (current.getWidth() / 2 >= w && current.getHeight() / 2 >= h) {
            current = scale(current, current.getWidth() / 2, current.getHeight() / 2);
        }
        BufferedImage scaled = scale(current, w, h);
        BufferedImage out = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.drawImage(scaled, (width - w) / 2, (height - h) / 2, null);
        g.dispose();
        return out;
    }

    private static BufferedImage toArgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_ARGB) return source;
        BufferedImage out = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.drawImage(source, 0, 0, null);
        g.dispose();
        return out;
    }

    private static BufferedImage scale(BufferedImage source, int w, int h) {
        BufferedImage out = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(source, 0, 0, w, h, null);
        g.dispose();
        return out;
    }

    /**
     * Découpe en tuiles de 128×128 (une par carte), converties en couleurs de carte.
     * Le tramage est fait sur l'image entière : pas de raccord visible entre deux cadres.
     * @return {@code tiles[row * cols + col]}, 16 384 octets chacune
     */
    public static byte[][] tiles(BufferedImage fitted, int cols, int rows, int[] palette, int firstIndex, boolean dither) {
        int width = cols * 128, height = rows * 128;
        int[] argb = fitted.getRGB(0, 0, width, height, null, 0, width);
        byte[] all = MapDither.convert(argb, width, height, palette, firstIndex, dither);
        byte[][] tiles = new byte[cols * rows][128 * 128];
        for (int row = 0; row < rows; row++) {
            for (int col = 0; col < cols; col++) {
                byte[] tile = tiles[row * cols + col];
                for (int y = 0; y < 128; y++) {
                    System.arraycopy(all, (row * 128 + y) * width + col * 128, tile, y * 128, 128);
                }
            }
        }
        return tiles;
    }
}
