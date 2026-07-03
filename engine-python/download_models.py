#!/usr/bin/env python3
"""
Télécharge inswapper_128.onnx (~530 Mo) dans ./models/.
(Les modèles de détection buffalo_l sont téléchargés automatiquement par
insightface au premier lancement.)
"""

import os
import sys
import urllib.request

MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "inswapper_128.onnx")
# Un vrai inswapper_128.onnx fait ~530 Mo : tout fichier plus petit est une
# page d'erreur déguisée (404 « Not Found », HTML…), pas le modèle.
MIN_SIZE_BYTES = 400 * 1024 * 1024
# Miroirs connus du modèle publié par deepinsight (essayés dans l'ordre)
URLS = [
    "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
    "https://huggingface.co/datasets/Gourieff/ReActor/resolve/main/models/inswapper_128.onnx",
]


def progress(count: int, block: int, total: int) -> None:
    done = count * block
    pct = min(100, done * 100 // total) if total > 0 else 0
    mb = done / 1024 / 1024
    sys.stdout.write(f"\r  {pct:3d}% ({mb:.0f} Mo)")
    sys.stdout.flush()


def is_valid() -> bool:
    return os.path.exists(MODEL_PATH) and os.path.getsize(MODEL_PATH) >= MIN_SIZE_BYTES


def main() -> None:
    if is_valid():
        print(f"Déjà présent : {MODEL_PATH}")
        return
    if os.path.exists(MODEL_PATH):
        # Résidu d'un téléchargement raté (page d'erreur, coupure réseau)
        print(f"Fichier invalide ({os.path.getsize(MODEL_PATH)} octets), suppression…")
        os.remove(MODEL_PATH)

    os.makedirs(MODEL_DIR, exist_ok=True)
    for url in URLS:
        print(f"Téléchargement depuis {url.split('/')[2]}…")
        try:
            urllib.request.urlretrieve(url, MODEL_PATH, reporthook=progress)
            print()
            if is_valid():
                print(f"OK → {MODEL_PATH}")
                return
            print(
                f"Fichier trop petit ({os.path.getsize(MODEL_PATH)} octets) : "
                "ce n'est pas le modèle, miroir suivant…"
            )
            os.remove(MODEL_PATH)
        except Exception as exc:  # noqa: BLE001
            print(f"\nÉchec ({exc}), miroir suivant…")
            if os.path.exists(MODEL_PATH):
                os.remove(MODEL_PATH)
    raise SystemExit(
        "Tous les miroirs ont échoué. Télécharge inswapper_128.onnx dans un "
        "navigateur (souvent plus fiable) :\n"
        f"  {URLS[0]}\n"
        f"puis place le fichier dans {MODEL_PATH}"
    )


if __name__ == "__main__":
    main()
