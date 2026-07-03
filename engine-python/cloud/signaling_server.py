#!/usr/bin/env python3
"""
Serveur de signalisation CamAIvo (mode CLOUD).

Met en relation 1 client (navigateur) ↔ 1 worker GPU et relaie les messages
{offer, answer, ice, set_avatar, options}. Une "room" par paire ; le premier
client libre est apparié au premier worker libre.

Lancement :  python cloud/signaling_server.py --host 0.0.0.0 --port 8888
Puis dans l'app : VITE_SIGNALING_WS=wss://ton-domaine:8888
"""

from __future__ import annotations

import argparse
import asyncio
import json

import websockets

# File des pairs en attente d'appariement
waiting: dict[str, "asyncio.Queue"] = {
    "client": asyncio.Queue(),
    "worker": asyncio.Queue(),
}


class Peer:
    def __init__(self, ws, role: str):
        self.ws = ws
        self.role = role
        self.partner: "Peer | None" = None


async def pair(peer: Peer) -> None:
    """Apparie client ↔ worker (le premier disponible de l'autre rôle)."""
    other_role = "worker" if peer.role == "client" else "client"
    other_queue = waiting[other_role]
    if not other_queue.empty():
        partner: Peer = await other_queue.get()
        peer.partner = partner
        partner.partner = peer
        for p in (peer, partner):
            await p.ws.send(json.dumps({"type": "paired"}))
        print(f"[signaling] paire formée (client ↔ worker)")
    else:
        await waiting[peer.role].put(peer)
        print(f"[signaling] {peer.role} en attente d'un pair…")


async def handle(ws) -> None:
    peer: Peer | None = None
    try:
        async for message in ws:
            msg = json.loads(message)
            if msg.get("type") == "join":
                role = msg.get("role", "client")
                if role not in ("client", "worker"):
                    await ws.send(json.dumps({"type": "error", "message": "rôle inconnu"}))
                    continue
                peer = Peer(ws, role)
                await pair(peer)
            elif peer and peer.partner:
                # Relais brut vers le pair (offer/answer/ice/set_avatar/options)
                await peer.partner.ws.send(message)
    except websockets.ConnectionClosed:
        pass
    finally:
        if peer and peer.partner:
            try:
                await peer.partner.ws.send(
                    json.dumps({"type": "error", "message": "pair déconnecté"})
                )
            except websockets.ConnectionClosed:
                pass
        print("[signaling] déconnexion")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8888)
    args = parser.parse_args()
    async with websockets.serve(handle, args.host, args.port):
        print(f"[signaling] en écoute sur ws://{args.host}:{args.port}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[signaling] arrêt")
