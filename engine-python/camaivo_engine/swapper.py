"""
Cœur du swap CamAIvo : insightface (détection buffalo_l) + inswapper_128.

Utilisé par :
  - sidecar_server.py (mode LOCAL, WebSocket)
  - cloud/worker.py   (mode CLOUD, WebRTC)

Options supportées (voir docs/SWAP_ENGINE_PROTOCOL.md) :
  transparency (0-1)  → fondu visage swappé / visage réel
  sharpness (0-1)     → netteté (unsharp mask) sur la zone swappée
  mouth_mask (bool)   → conserve la vraie bouche (meilleure synchro labiale)
  face_enhancer(bool) → réservé (GFPGAN), ignoré si non installé
  det_size, max_faces → fixés à 320×320 / 1 visage (spec CamAIvo)
"""

from __future__ import annotations

import os
import time

import cv2
import numpy as np


def _largest_face(faces):
    """Un seul visage max : on garde le plus grand cadre détecté."""
    return max(
        faces,
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
    )


class BaseEngine:
    """Interface commune (le serveur ne connaît que ces 3 méthodes)."""

    def set_avatar(self, image_bgr: np.ndarray) -> None:
        raise NotImplementedError

    def set_options(self, options: dict) -> None:
        raise NotImplementedError

    def process(self, frame_bgr: np.ndarray) -> np.ndarray:
        raise NotImplementedError


class FaceSwapEngine(BaseEngine):
    """Vrai moteur : détection insightface + swap inswapper_128."""

    def __init__(self, model_path: str, use_gpu: bool = True):
        # Imports ici : lourds, et absents en mode --demo
        from insightface.app import FaceAnalysis
        from insightface.model_zoo import get_model

        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if use_gpu
            else ["CPUExecutionProvider"]
        )
        print(f"[engine] chargement des modèles (providers={providers[0]})…")
        t0 = time.time()
        self.analyser = FaceAnalysis(name="buffalo_l", providers=providers)
        self.analyser.prepare(ctx_id=0 if use_gpu else -1, det_size=(320, 320))
        self.swapper = get_model(model_path, providers=providers)
        print(f"[engine] modèles prêts en {time.time() - t0:.1f} s")

        self.source_face = None
        self.options = {
            "transparency": 1.0,
            "sharpness": 0.0,
            "mouth_mask": False,
            "face_enhancer": False,
        }

    def set_avatar(self, image_bgr: np.ndarray) -> None:
        faces = self.analyser.get(image_bgr)
        if not faces:
            raise ValueError(
                "Aucun visage détecté sur la photo de l'avatar "
                "(visage net, centré, face caméra)."
            )
        self.source_face = _largest_face(faces)

    def set_options(self, options: dict) -> None:
        for key in self.options:
            if key in options:
                self.options[key] = options[key]

    def process(self, frame_bgr: np.ndarray) -> np.ndarray:
        if self.source_face is None:
            return frame_bgr
        faces = self.analyser.get(frame_bgr)
        if not faces:
            return frame_bgr
        target = _largest_face(faces)  # max_faces = 1

        out = self.swapper.get(frame_bgr, target, self.source_face, paste_back=True)

        if self.options["mouth_mask"]:
            out = self._restore_mouth(frame_bgr, out, target)
        alpha = float(self.options["transparency"])
        if alpha < 0.999:
            out = cv2.addWeighted(out, alpha, frame_bgr, 1.0 - alpha, 0)
        sharp = float(self.options["sharpness"])
        if sharp > 0.01:
            blur = cv2.GaussianBlur(out, (0, 0), 2.0)
            out = cv2.addWeighted(out, 1.0 + 0.8 * sharp, blur, -0.8 * sharp, 0)
        return out

    @staticmethod
    def _restore_mouth(original, swapped, face) -> np.ndarray:
        """Recolle la bouche réelle (kps insightface : 3=coin gauche, 4=coin droit)."""
        kps = face.kps
        left, right = kps[3], kps[4]
        center = ((left + right) / 2).astype(int)
        width = float(np.linalg.norm(right - left))
        axes = (max(int(width * 0.9), 8), max(int(width * 0.6), 6))

        mask = np.zeros(original.shape[:2], dtype=np.float32)
        cv2.ellipse(mask, tuple(center), axes, 0, 0, 360, 1.0, -1)
        mask = cv2.GaussianBlur(mask, (31, 31), 0)[..., None]
        return (original * mask + swapped * (1.0 - mask)).astype(np.uint8)


class DemoEngine(BaseEngine):
    """
    Moteur factice (--demo) : AUCUN modèle requis. Sert à valider la
    plomberie (protocole, frames, stats) sans GPU ni téléchargement.
    """

    def __init__(self):
        self.options = {"transparency": 1.0}
        self.has_avatar = False

    def set_avatar(self, image_bgr: np.ndarray) -> None:
        self.has_avatar = True

    def set_options(self, options: dict) -> None:
        self.options.update(options)

    def process(self, frame_bgr: np.ndarray) -> np.ndarray:
        out = cv2.applyColorMap(frame_bgr, cv2.COLORMAP_AUTUMN)
        out = cv2.addWeighted(frame_bgr, 0.6, out, 0.4, 0)
        cv2.putText(
            out,
            "CamAIvo SIDECAR (demo, pas de modele)",
            (12, 28),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2,
        )
        return out


def load_engine(demo: bool, model_path: str | None, use_gpu: bool) -> BaseEngine:
    if demo:
        return DemoEngine()
    path = model_path or os.environ.get(
        "INSWAPPER_MODEL_PATH", "models/inswapper_128.onnx"
    )
    if not os.path.exists(path):
        raise SystemExit(
            f"Modèle introuvable : {path}\n"
            "→ lance d'abord :  python download_models.py\n"
            "   (ou définis INSWAPPER_MODEL_PATH)"
        )
    return FaceSwapEngine(path, use_gpu=use_gpu)
