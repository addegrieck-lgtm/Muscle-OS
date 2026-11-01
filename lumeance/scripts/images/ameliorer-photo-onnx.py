# Variante SANS PyTorch de ameliorer-photo.py (même modèle, même procédé) : Real-ESRGAN ×2 exécuté
# avec onnxruntime. Utile quand download.pytorch.org ou huggingface.co sont inaccessibles.
#
# Installation (une fois, hors du projet) :
#   python3 -m venv /tmp/srenv && /tmp/srenv/bin/pip install onnx onnxruntime numpy pillow
#   curl -L -o /tmp/RealESRGAN_x2plus.pth \
#     https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth
# Usage :
#   /tmp/srenv/bin/python -I scripts/images/ameliorer-photo-onnx.py /tmp/RealESRGAN_x2plus.pth \
#     photo-fournisseur.png public/products/<piece>/ambiance-<nom>.webp
#
# Le fichier .pth est lu sans exécuter de code : seules les classes nécessaires à la
# reconstruction des tenseurs sont acceptées par le dépickleur.
import io, sys, pickle, zipfile
import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto
import onnxruntime as ort
from PIL import Image

DTYPES = {"FloatStorage": np.float32, "HalfStorage": np.float16, "DoubleStorage": np.float64}


def load_pth(path):
    z = zipfile.ZipFile(path)
    pkl = next(n for n in z.namelist() if n.endswith("data.pkl"))
    prefix = pkl[: -len("data.pkl")]

    def rebuild(storage, offset, size, stride, *_):
        return np.lib.stride_tricks.as_strided(
            storage[offset:], shape=size, strides=[s * storage.itemsize for s in stride]).copy()

    class Unpickler(pickle.Unpickler):
        def find_class(self, mod, name):
            if mod == "torch._utils" and name == "_rebuild_tensor_v2": return rebuild
            if mod == "torch" and name in DTYPES: return name  # type de stockage
            if mod == "collections" and name == "OrderedDict":
                import collections; return collections.OrderedDict
            raise pickle.UnpicklingError(f"classe refusée : {mod}.{name}")

        def persistent_load(self, pid):
            _, storage_type, key, _location, _numel = pid
            return np.frombuffer(z.read(f"{prefix}data/{key}"), dtype=DTYPES[storage_type])

    sd = Unpickler(io.BytesIO(z.read(pkl))).load()
    return sd.get("params_ema", sd.get("params", sd))


def build(sd, h, w, nb=23):
    nodes, inits = [], []
    cnt = [0]

    def name(p): cnt[0] += 1; return f"{p}{cnt[0]}"

    def conv(x, key, act=False):
        wn, bn = key + ".weight", key + ".bias"
        if wn not in [i.name for i in inits]:
            inits.append(numpy_helper.from_array(sd[wn].astype(np.float32), wn))
            inits.append(numpy_helper.from_array(sd[bn].astype(np.float32), bn))
        y = name("c")
        nodes.append(helper.make_node("Conv", [x, wn, bn], [y], pads=[1, 1, 1, 1], kernel_shape=[3, 3]))
        if act:
            z = name("a"); nodes.append(helper.make_node("LeakyRelu", [y], [z], alpha=0.2)); return z
        return y

    def add(a, b): y = name("s"); nodes.append(helper.make_node("Add", [a, b], [y])); return y

    def mul(a, k):
        c = name("k"); inits.append(numpy_helper.from_array(np.array(k, np.float32), c))
        y = name("m"); nodes.append(helper.make_node("Mul", [a, c], [y])); return y

    def concat(xs): y = name("cat"); nodes.append(helper.make_node("Concat", xs, [y], axis=1)); return y

    def const(v, dt=np.int64):
        c = name("v"); inits.append(numpy_helper.from_array(np.array(v, dt), c)); return c

    # pixel_unshuffle(2) dans l'ordre de PyTorch : canal = c*4 + i*2 + j
    r1 = name("r"); nodes.append(helper.make_node("Reshape", ["x", const([1, 3, h // 2, 2, w // 2, 2])], [r1]))
    t1 = name("t"); nodes.append(helper.make_node("Transpose", [r1], [t1], perm=[0, 1, 3, 5, 2, 4]))
    x = name("r"); nodes.append(helper.make_node("Reshape", [t1, const([1, 12, h // 2, w // 2])], [x]))

    feat = conv(x, "conv_first")
    body = feat
    for i in range(nb):
        rrdb_in = body
        for r in (1, 2, 3):
            p = f"body.{i}.rdb{r}"
            x0 = body
            x1 = conv(x0, p + ".conv1", True)
            x2 = conv(concat([x0, x1]), p + ".conv2", True)
            x3 = conv(concat([x0, x1, x2]), p + ".conv3", True)
            x4 = conv(concat([x0, x1, x2, x3]), p + ".conv4", True)
            x5 = conv(concat([x0, x1, x2, x3, x4]), p + ".conv5")
            body = add(mul(x5, 0.2), x0)
        body = add(mul(body, 0.2), rrdb_in)
    feat = add(feat, conv(body, "conv_body"))
    scales = const([1, 1, 2, 2], np.float32)
    for k in ("conv_up1", "conv_up2"):
        u = name("u")
        nodes.append(helper.make_node("Resize", [feat, "", scales], [u], mode="nearest",
                                      nearest_mode="floor", coordinate_transformation_mode="asymmetric"))
        feat = conv(u, k, True)
    out = conv(conv(feat, "conv_hr", True), "conv_last")
    nodes.append(helper.make_node("Identity", [out], ["y"]))
    g = helper.make_graph(
        nodes, "realesrgan_x2",
        [helper.make_tensor_value_info("x", TensorProto.FLOAT, [1, 3, h, w])],
        [helper.make_tensor_value_info("y", TensorProto.FLOAT, [1, 3, h * 2, w * 2])], inits)
    m = helper.make_model(g, opset_imports=[helper.make_opsetid("", 17)])
    m.ir_version = 8
    return m


def crop_4_5(img):
    w, h = img.size
    if w * 5 > h * 4:
        nw = h * 4 // 5; l = (w - nw) // 2; return img.crop((l, 0, l + nw, h))
    nh = w * 5 // 4; t = (h - nh) // 2; return img.crop((0, t, w, t + nh))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage : ameliorer-photo-onnx.py poids.pth source destination.webp")
    weights, src, dst = sys.argv[1:]
    img = crop_4_5(Image.open(src).convert("RGB"))
    img = img.crop((0, 0, img.width - img.width % 2, img.height - img.height % 2))
    a = np.asarray(img).astype(np.float32).transpose(2, 0, 1)[None] / 255.0
    model = build(load_pth(weights), a.shape[2], a.shape[3])
    sess = ort.InferenceSession(model.SerializeToString(), providers=["CPUExecutionProvider"])
    y = sess.run(None, {"x": a})[0][0]
    out = Image.fromarray((np.clip(y.transpose(1, 2, 0), 0, 1) * 255).round().astype(np.uint8))
    out.resize((1600, 2000), Image.LANCZOS).save(dst, "WEBP", quality=88)
    print("✔", dst)
