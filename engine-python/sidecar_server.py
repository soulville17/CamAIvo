#!/usr/bin/env python3
"""
Sidecar CamAIvo — moteur de swap LOCAL (WebSocket).

Implémente le protocole de docs/SWAP_ENGINE_PROTOCOL.md :
  navigateur → sidecar : JSON {init, set_avatar, options, stop} + frames JPEG binaires
  sidecar → navigateur : JSON {ready, avatar_ready, stats, error} + frames JPEG binaires

Lancement :
  python sidecar_server.py                # vrai swap (GPU si dispo)
  python sidecar_server.py --cpu          # vrai swap sur CPU (lent)
  python sidecar_server.py --demo         # sans modèles : valide la plomberie
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import time

import cv2
import numpy as np
import websockets

from camaivo_engine import load_engine

JPEG_QUALITY = 70


def decode_data_url(data_url: str) -> np.ndarray:
    """data:image/...;base64,xxxx → image BGR."""
    payload = data_url.split(",", 1)[1] if "," in data_url else data_url
    raw = np.frombuffer(base64.b64decode(payload), np.uint8)
    img = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Image de l'avatar illisible")
    return img


class Session:
    """Une connexion navigateur : frames en 'latest-wins', jamais de file."""

    def __init__(self, engine):
        self.engine = engine
        self.latest_frame: bytes | None = None
        self.frame_event = asyncio.Event()
        self.processed = 0
        self.latency_ms = 0.0
        self.running = True

    async def frame_worker(self, ws) -> None:
        """Traite toujours LA DERNIÈRE frame reçue (les autres sont jetées)."""
        loop = asyncio.get_running_loop()
        while self.running:
            await self.frame_event.wait()
            self.frame_event.clear()
            data = self.latest_frame
            if data is None:
                continue
            t0 = time.time()
            try:
                # Le swap (CPU/GPU-bound) part dans un thread pour ne pas
                # bloquer la réception des messages suivants.
                jpeg = await loop.run_in_executor(None, self._process_jpeg, data)
            except Exception as exc:  # noqa: BLE001 — on informe le client
                await ws.send(json.dumps({"type": "error", "message": str(exc)}))
                continue
            self.latency_ms = (time.time() - t0) * 1000
            self.processed += 1
            await ws.send(jpeg)

    def _process_jpeg(self, data: bytes) -> bytes:
        frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("frame illisible")
        out = self.engine.process(frame)
        ok, encoded = cv2.imencode(
            ".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        )
        if not ok:
            raise ValueError("échec d'encodage JPEG")
        return encoded.tobytes()

    async def stats_loop(self, ws) -> None:
        """Télémétrie ~1 s → barre d'état de l'app."""
        while self.running:
            await asyncio.sleep(1)
            fps, self.processed = self.processed, 0
            try:
                await ws.send(
                    json.dumps(
                        {
                            "type": "stats",
                            "fps": fps,
                            "latency_ms": round(self.latency_ms),
                        }
                    )
                )
            except websockets.ConnectionClosed:
                return


def make_handler(engine):
    async def handle(ws) -> None:
        print(f"[sidecar] client connecté : {ws.remote_address}")
        session = Session(engine)
        tasks: list[asyncio.Task] = []
        try:
            async for message in ws:
                if isinstance(message, bytes):
                    session.latest_frame = message
                    session.frame_event.set()
                    continue

                msg = json.loads(message)
                mtype = msg.get("type")

                if mtype == "init":
                    engine.set_options(msg.get("options", {}))
                    tasks = [
                        asyncio.create_task(session.frame_worker(ws)),
                        asyncio.create_task(session.stats_loop(ws)),
                    ]
                    await ws.send(json.dumps({"type": "ready"}))

                elif mtype == "set_avatar":
                    loop = asyncio.get_running_loop()
                    try:
                        img = decode_data_url(msg["image"])
                        await loop.run_in_executor(None, engine.set_avatar, img)
                        await ws.send(
                            json.dumps(
                                {
                                    "type": "avatar_ready",
                                    "avatar_id": msg.get("avatar_id"),
                                }
                            )
                        )
                        print(f"[sidecar] avatar prêt : {msg.get('avatar_id')}")
                    except Exception as exc:  # noqa: BLE001
                        await ws.send(
                            json.dumps({"type": "error", "message": str(exc)})
                        )

                elif mtype == "options":
                    engine.set_options(msg.get("options", {}))

                elif mtype == "stop":
                    break
        except websockets.ConnectionClosed:
            pass
        finally:
            session.running = False
            session.frame_event.set()
            for task in tasks:
                task.cancel()
            print("[sidecar] client déconnecté")

    return handle


async def main() -> None:
    parser = argparse.ArgumentParser(description="Sidecar CamAIvo (moteur local)")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument(
        "--engine",
        choices=["inswapper", "liveportrait"],
        default="inswapper",
        help="inswapper = swap du visage seul · liveportrait = tout l'avatar "
        "animé par tes mouvements (style MirageCam, GPU recommandé)",
    )
    parser.add_argument("--model", default=None, help="chemin de inswapper_128.onnx")
    parser.add_argument("--cpu", action="store_true", help="forcer le CPU (lent)")
    parser.add_argument(
        "--demo", action="store_true", help="sans modèles (test de plomberie)"
    )
    args = parser.parse_args()

    engine = load_engine(
        demo=args.demo,
        model_path=args.model,
        use_gpu=not args.cpu,
        engine_kind=args.engine,
    )

    async with websockets.serve(
        make_handler(engine), args.host, args.port, max_size=8 * 1024 * 1024
    ):
        mode = "DÉMO (aucun swap réel)" if args.demo else "SWAP RÉEL"
        print(f"[sidecar] {mode} — en écoute sur ws://{args.host}:{args.port}")
        print("[sidecar] dans CamAIvo : Paramètres → Moteur de swap → Local")
        await asyncio.Future()  # tourne jusqu'à Ctrl+C


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[sidecar] arrêt")
