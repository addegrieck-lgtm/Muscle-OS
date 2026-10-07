import { connect } from "node:net";

/**
 * Client minimal du protocole « Server List Ping » (Minecraft ≥ 1.7).
 * Utilisé côté API uniquement — le navigateur ne contacte jamais le serveur Minecraft.
 * Sert de source de statut tant que le plugin VæloriaBridge n'envoie pas de heartbeat.
 */
export interface PingResult {
  online: number;
  max: number;
  version: string;
  motd: string;
  latencyMs: number;
}

function varInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf: Buffer, offset: number): { value: number; size: number } | null {
  let value = 0;
  let size = 0;
  let byte: number;
  do {
    if (offset + size >= buf.length) return null;
    byte = buf[offset + size]!;
    value |= (byte & 0x7f) << (7 * size);
    size++;
    if (size > 5) throw new Error("VarInt trop long");
  } while (byte & 0x80);
  return { value, size };
}

function packet(id: number, payload: Buffer): Buffer {
  const body = Buffer.concat([varInt(id), payload]);
  return Buffer.concat([varInt(body.length), body]);
}

function motdText(desc: unknown): string {
  if (typeof desc === "string") return desc;
  if (desc && typeof desc === "object") {
    const d = desc as { text?: string; extra?: unknown[] };
    return (d.text ?? "") + (d.extra ?? []).map(motdText).join("");
  }
  return "";
}

export function pingMinecraft(host: string, port = 25565, timeoutMs = 3000): Promise<PingResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const socket = connect({ host, port });
    let data = Buffer.alloc(0);
    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(timeoutMs, () => fail(new Error("Délai dépassé")));
    socket.on("error", fail);
    socket.on("connect", () => {
      const hostBuf = Buffer.from(host, "utf8");
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port);
      // Handshake : protocole -1 (inconnu), état suivant 1 (status)
      const handshake = packet(0x00, Buffer.concat([varInt(-1 >>> 0), varInt(hostBuf.length), hostBuf, portBuf, varInt(1)]));
      socket.write(Buffer.concat([handshake, packet(0x00, Buffer.alloc(0))]));
    });
    socket.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
      if (data.length > 64 * 1024) return fail(new Error("Réponse trop volumineuse"));
      try {
        const len = readVarInt(data, 0);
        if (!len || data.length < len.size + len.value) return;
        const id = readVarInt(data, len.size);
        if (!id || id.value !== 0x00) return fail(new Error("Paquet inattendu"));
        const strLen = readVarInt(data, len.size + id.size);
        if (!strLen) return;
        const start = len.size + id.size + strLen.size;
        const json = JSON.parse(data.subarray(start, start + strLen.value).toString("utf8")) as {
          players?: { online?: number; max?: number };
          version?: { name?: string };
          description?: unknown;
        };
        socket.destroy();
        resolve({
          online: json.players?.online ?? 0,
          max: json.players?.max ?? 0,
          version: json.version?.name ?? "inconnue",
          motd: motdText(json.description).replace(/§./g, "").trim(),
          latencyMs: Date.now() - started,
        });
      } catch (err) {
        fail(err as Error);
      }
    });
  });
}
