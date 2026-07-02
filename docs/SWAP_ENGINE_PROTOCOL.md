# Contrat des moteurs de swap CamAIvo

L'app web ne fait jamais le swap elle-même : elle parle à un moteur via
l'adaptateur `SwapEngine` (`src/features/swap-engine/`). Ce document décrit
les deux protocoles à implémenter côté moteur.

- **Mode `local`** → sidecar Python sur la machine de l'utilisateur (WebSocket)
- **Mode `cloud`** → worker GPU distant (signalisation WebSocket + WebRTC)

Le mode effectif d'une session : `VITE_SWAP_MODE=mock` force le mock ; sinon le
toggle **CLOUD/LOCAL** du header choisit l'implémentation.

---

## 1. Mode LOCAL — sidecar Python (insightface / inswapper_128)

**Transport :** WebSocket, `ws://127.0.0.1:8787` (configurable via
`VITE_LOCAL_SWAP_WS`). Le serveur est lancé par l'utilisateur sur sa machine
(GPU). Messages **texte = JSON**, messages **binaires = frames JPEG**.

### Séquence

```
Client (navigateur)                      Sidecar Python
       │  ── connexion WebSocket ──────────►
       │  ── {"type":"init", options} ─────►
       ◄─────────────── {"type":"ready"} ──│   (modèles chargés)
       │  ── {"type":"set_avatar", …} ─────►
       ◄──────── {"type":"avatar_ready"} ──│   (embedding calculé)
       │  ══ frame JPEG (binaire) ═════════►   à target_fps (20 par défaut)
       ◄══════════ frame JPEG transformée ═│   (latest-wins, pas de file)
       ◄─────────────── {"type":"stats"} ──│   toutes les ~1 s
       │  ── {"type":"stop"} ──────────────►   puis fermeture
```

### Messages client → sidecar (JSON)

| Message | Payload | Rôle |
| --- | --- | --- |
| `init` | `{"type":"init","options":{…}}` | Envoyé dès l'ouverture. Le sidecar répond `ready` quand ses modèles sont chargés (le client attend 5 s max). |
| `set_avatar` | `{"type":"set_avatar","avatar_id":"uuid","image":"data:image/jpeg;base64,…"}` | Image source du visage en data-URL. Le sidecar extrait l'embedding et répond `avatar_ready` (le client attend 3 s puis continue). Peut arriver **en cours de session** (swap à chaud). |
| `options` | `{"type":"options","options":{…}}` | Mise à jour à chaud des options. |
| `stop` | `{"type":"stop"}` | Fin de session, le sidecar peut libérer le GPU. |

**Objet `options`** (mêmes clés dans `init` et `options`) :

```json
{
  "transparency": 0.85,
  "sharpness": 0.5,
  "mouth_mask": false,
  "face_enhancer": false,
  "det_size": [320, 320],
  "max_faces": 1,
  "target_fps": 20
}
```

### Messages client → sidecar (binaire)

Chaque message binaire est **une frame JPEG complète** de la webcam
(640×480 par défaut, qualité 0,7). Le client applique une **backpressure** :
il saute des frames si le buffer WebSocket dépasse 256 Ko. Le sidecar doit
traiter en *latest-wins* : si une frame arrive pendant qu'il calcule, il jette
l'ancienne — jamais de file d'attente (sinon la latence explose).

### Messages sidecar → client

| Message | Payload | Rôle |
| --- | --- | --- |
| `ready` | `{"type":"ready"}` | Handshake terminé, le client passe « connecté ». |
| `avatar_ready` | `{"type":"avatar_ready","avatar_id":"uuid"}` | Embedding du visage prêt. |
| `stats` | `{"type":"stats","fps":18,"latency_ms":45}` | Télémétrie affichée dans la barre d'état (~1 s). |
| `error` | `{"type":"error","message":"…"}` | Erreur non fatale, affichée à l'utilisateur. |
| *(binaire)* | frame JPEG transformée | Affichée dans la « Caméra CamAIvo ». |

### Squelette Python de référence

```python
# pip install websockets opencv-python insightface onnxruntime-gpu
import asyncio, base64, json, cv2, numpy as np, websockets

async def handle(ws):
    swapper = None   # insightface inswapper_128 + embedding de l'avatar
    async for message in ws:
        if isinstance(message, bytes):
            frame = cv2.imdecode(np.frombuffer(message, np.uint8), cv2.IMREAD_COLOR)
            out = swap_face(frame)          # ← ton moteur existant
            ok, jpeg = cv2.imencode(".jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 70])
            await ws.send(jpeg.tobytes())
        else:
            msg = json.loads(message)
            if msg["type"] == "init":
                load_models(msg["options"])           # det_size, max_faces…
                await ws.send(json.dumps({"type": "ready"}))
            elif msg["type"] == "set_avatar":
                img = decode_data_url(msg["image"])
                compute_embedding(img)
                await ws.send(json.dumps({"type": "avatar_ready",
                                          "avatar_id": msg["avatar_id"]}))
            elif msg["type"] == "options":
                update_options(msg["options"])
            elif msg["type"] == "stop":
                break

asyncio.run(websockets.serve(handle, "127.0.0.1", 8787))
```

---

## 2. Mode CLOUD — worker GPU distant (WebRTC)

**Transports :** WebSocket de signalisation (`VITE_SIGNALING_WS`) + WebRTC.
La vidéo passe en WebRTC (piste webcam → worker, piste transformée → client) ;
le contrôle passe par un **DataChannel `control`** (repli : signalisation).

### Séquence

```
Client                    Signalisation                Worker GPU
  │ ── {"type":"join","role":"client"} ──►
  │                            │ ◄─ {"type":"join","role":"worker"} ─│
  │ ── {"type":"offer","sdp"} ─┼────────────────────────────────────►│
  │ ◄──────────────────────────┼── {"type":"answer","sdp"} ──────────│
  │ ◄─ {"type":"ice",…} ───────┼──────────────────── {"type":"ice"} ─│  (les deux sens)
  │ ══ piste vidéo webcam ═════════════════════════════════════════► │  (WebRTC)
  │ ◄════════════════════════════════════ piste vidéo transformée ══ │  (WebRTC)
  │ ── DataChannel "control" : set_avatar / options ────────────────►│
```

### Messages de contrôle (DataChannel `control`, ou signalisation en repli)

| Message | Payload |
| --- | --- |
| `set_avatar` | `{"type":"set_avatar","avatar_id":"uuid","image_url":"https://…supabase.co/…"}` — le worker télécharge l'image (URL publique Supabase Storage). |
| `options` | `{"type":"options","options":{"transparency":…,"sharpness":…,"mouth_mask":…,"face_enhancer":…}}` |

### Notes d'implémentation côté client (déjà en place)

- STUN public Google ; **TODO : serveur TURN** pour les NAT stricts (résidences,
  4G) — credentials à distribuer côté serveur.
- États ICE mappés sur la pastille de connexion : `connected` → stable,
  `connecting/disconnected` → instable, `failed/closed` → rouge + erreur.
- Stats affichées depuis `RTCPeerConnection.getStats()` : `inbound-rtp
  video.framesPerSecond` et `candidate-pair.currentRoundTripTime`.

### Ce qui reste à construire (hors périmètre de l'app web)

1. **Serveur de signalisation** : relie 1 client ↔ 1 worker (rooms), relaye
   `offer/answer/ice` et les messages de contrôle si le DataChannel n'est pas
   encore ouvert. ~100 lignes de Node/Python.
2. **Worker GPU** (ex. RunPod) : `aiortc` côté Python — reçoit la piste,
   applique le swap frame par frame, renvoie la piste transformée.
3. **Authentification** : joindre le JWT Supabase dans `join` et le vérifier
   côté signalisation (l'Edge Function `consume-points` décompte déjà les
   points indépendamment du moteur).
