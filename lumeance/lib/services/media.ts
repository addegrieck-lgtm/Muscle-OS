import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";

type ImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Détermine le type réel d'une image à partir de ses premiers octets (le type MIME déclaré par
 * le navigateur n'est pas fiable). Retourne null pour tout autre contenu (SVG, HTML, exécutable…). */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "image/avif";
  return null;
}

const EXT: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export interface UploadCheck {
  ok: boolean;
  error?: string;
  type?: ImageType;
  extension?: string;
}

export function checkUpload(size: number, head: Uint8Array): UploadCheck {
  if (size <= 0) return { ok: false, error: "Fichier vide." };
  if (size > MAX_UPLOAD_BYTES) return { ok: false, error: "Fichier trop lourd (10 Mo maximum)." };
  const type = sniffImageType(head);
  if (!type) return { ok: false, error: "Format refusé : JPEG, PNG, WebP ou AVIF uniquement." };
  return { ok: true, type, extension: EXT[type] };
}

/** Nom de fichier de stockage : jamais dérivé du nom fourni par l'utilisateur. */
export function storagePath(folder: string, extension: string, id: string): string {
  const d = new Date();
  return `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${id}.${extension}`;
}
