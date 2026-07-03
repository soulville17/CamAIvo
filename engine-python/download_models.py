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


def main() -> None:
    if os.path.exists(MODEL_PATH):
        print(f"Déjà présent : {MODEL_PATH}")
        return
    os.makedirs(MODEL_DIR, exist_ok=True)
    for url in URLS:
        print(f"Téléchargement depuis {url.split('/')[2]}…")
        try:
            urllib.request.urlretrieve(url, MODEL_PATH, reporthook=progress)
            print(f"\nOK → {MODEL_PATH}")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"\nÉchec ({exc}), miroir suivant…")
    raise SystemExit(
        "Tous les miroirs ont échoué. Télécharge inswapper_128.onnx manuellement "
        f"et place-le dans {MODEL_PATH}"
    )


if __name__ == "__main__":
    main()
