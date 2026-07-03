#!/usr/bin/env python3
"""
Worker GPU CamAIvo (mode CLOUD) — aiortc.

Se connecte au serveur de signalisation en tant que "worker", reçoit la piste
webcam du client en WebRTC, applique le swap frame par frame, et renvoie la
piste transformée. Les commandes set_avatar/options arrivent par le
DataChannel "control" (ou la signalisation en repli).

Lancement (sur la machine GPU, ex. RunPod) :
  python cloud/worker.py --signaling ws://<hote-signalisation>:8888
  python cloud/worker.py --signaling ws://… --demo    # test sans modèles
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import urllib.request

import cv2
import numpy as np
import websockets
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    VideoStreamTrack,
)
from av import VideoFrame

sys.path.insert(0, __file__.rsplit("/", 2)[0])  # engine-python/ dans le path
from camaivo_engine import load_engine  # noqa: E402


class SwapTrack(VideoStreamTrack):
    """Piste sortante : chaque frame reçue est passée au moteur de swap."""

    def __init__(self, source: VideoStreamTrack, engine):
        super().__init__()
        self.source = source
        self.engine = engine

    async def recv(self) -> VideoFrame:
        frame = await self.source.recv()
        img = frame.to_ndarray(format="bgr24")
        loop = asyncio.get_running_loop()
        out = await loop.run_in_executor(None, self.engine.process, img)
        new_frame = VideoFrame.from_ndarray(out, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame


def fetch_image(url: str) -> np.ndarray:
    """Télécharge l'image de l'avatar (URL publique Supabase Storage)."""
    with urllib.request.urlopen(url, timeout=15) as response:
        raw = np.frombuffer(response.read(), np.uint8)
    img = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("image d'avatar illisible")
    return img


async def handle_control(engine, payload: str, loop) -> None:
    msg = json.loads(payload)
    if msg.get("type") == "set_avatar":
        img = await loop.run_in_executor(None, fetch_image, msg["image_url"])
        await loop.run_in_executor(None, engine.set_avatar, img)
        print(f"[worker] avatar prêt : {msg.get('avatar_id')}")
    elif msg.get("type") == "options":
        engine.set_options(msg.get("options", {}))


async def run(signaling_url: str, engine) -> None:
    loop = asyncio.get_running_loop()
    async with websockets.connect(signaling_url) as ws:
        await ws.send(json.dumps({"type": "join", "role": "worker"}))
        print(f"[worker] connecté à la signalisation, en attente d'un client…")

        pc = RTCPeerConnection()

        @pc.on("track")
        def on_track(track):
            if track.kind == "video":
                print("[worker] piste webcam reçue → swap actif")
                pc.addTrack(SwapTrack(track, engine))

        @pc.on("datachannel")
        def on_datachannel(channel):
            @channel.on("message")
            def on_message(message):
                asyncio.ensure_future(handle_control(engine, message, loop))

        async for message in ws:
            msg = json.loads(message)
            mtype = msg.get("type")
            if mtype == "offer":
                await pc.setRemoteDescription(
                    RTCSessionDescription(sdp=msg["sdp"], type="offer")
                )
                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                await ws.send(
                    json.dumps({"type": "answer", "sdp": pc.localDescription.sdp})
                )
                print("[worker] answer envoyée, connexion WebRTC en cours…")
            elif mtype == "ice" and msg.get("candidate"):
                # aiortc gère les candidats via le SDP ; les trickle ICE
                # entrants sont acceptés silencieusement.
                pass
            elif mtype in ("set_avatar", "options"):
                await handle_control(engine, message, loop)

        await pc.close()


async def main() -> None:
    parser = argparse.ArgumentParser(description="Worker GPU CamAIvo")
    parser.add_argument("--signaling", required=True, help="ws://hote:8888")
    parser.add_argument("--model", default=None)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    engine = load_engine(demo=args.demo, model_path=args.model, use_gpu=not args.cpu)

    # Boucle : après chaque session, on se remet en attente d'un client
    while True:
        try:
            await run(args.signaling, engine)
        except (websockets.ConnectionClosed, ConnectionError) as exc:
            print(f"[worker] connexion perdue ({exc}), reconnexion dans 3 s…")
            await asyncio.sleep(3)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[worker] arrêt")
