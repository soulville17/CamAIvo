# Moteur de swap CamAIvo (Python)

Le **vrai** face-swap (insightface + inswapper_128), avec deux modes d'exécution
qui partagent le même cœur (`camaivo_engine/`) :

| Mode | Entrée | Où ça tourne | Pour qui |
| --- | --- | --- | --- |
| **Local** (recommandé pour démarrer) | `sidecar_server.py` | Sur **ton PC** (GPU NVIDIA conseillé) | Toi / créateurs équipés |
| **Cloud** | `cloud/worker.py` + `cloud/signaling_server.py` | Serveur GPU loué (RunPod…) | Le SaaS final, aucun GPU côté utilisateur |

---

## Mode LOCAL — démarrage rapide

```bash
cd engine-python
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python download_models.py          # inswapper_128.onnx (~530 Mo, une seule fois)
python sidecar_server.py           # → ws://127.0.0.1:8787
```

Puis dans CamAIvo (site déployé **ou** local, Chrome recommandé) :
**Paramètres → Moteur de swap → Local** → Live Swap → **DÉMARRER LE SWAP**.
Ton visage est remplacé par l'avatar sélectionné, en vrai.

- Sans GPU NVIDIA : `pip install onnxruntime` (à la place d'onnxruntime-gpu)
  puis `python sidecar_server.py --cpu` (2-6 fps selon la machine).
- Test de plomberie sans rien télécharger : `python sidecar_server.py --demo`
  (applique un filtre visible, aucun vrai swap).
- Performances attendues : RTX 3060+ ≈ 15-25 fps en 640×480 ; le
  `face_enhancer` reste OFF par défaut (spec CamAIvo).

## Mode LivePortrait — remplacement COMPLET de l'apparence 🎭

`sidecar_server.py --engine liveportrait` ne remplace pas que le visage :
**toute l'image de l'avatar** (cheveux, vêtements, fond) est animée par tes
mouvements et expressions — l'effet « MirageCam ». GPU NVIDIA requis pour le
temps réel (CPU ≈ 1 fps).

```powershell
# 1. Cloner FasterLivePortrait À CÔTÉ de CamAIvo (une seule fois)
cd $HOME\Documents
git clone https://github.com/warmshao/FasterLivePortrait
cd FasterLivePortrait

# 2. Ses dépendances (dans le venv CamAIvo déjà activé) + ses modèles ONNX
pip install -r requirements.txt
huggingface-cli download warmshao/FasterLivePortrait --local-dir .\checkpoints

# 3. Lancer le sidecar en mode liveportrait
cd $HOME\Documents\CamAIvo\engine-python
$env:FLP_DIR = "$HOME\Documents\FasterLivePortrait"
python sidecar_server.py --engine liveportrait
```

Conseils : l'avatar doit être un **portrait photo net** (buste, face caméra,
fond simple) — c'est cette image entière qui devient « toi ». Les avatars
dessinés (SVG) fonctionnent mal ici ; upload une vraie photo dans
« Mes avatars ».

## Mode CLOUD — architecture

```
Navigateur ──WebSocket──► signaling_server.py ◄──WebSocket── worker.py (GPU)
     │                                                          │
     └────────────────── WebRTC (vidéo aller/retour) ───────────┘
```

1. **Signalisation** (petite VM publique, pas de GPU) :
   `python cloud/signaling_server.py --port 8888` — mets-la derrière un
   reverse-proxy TLS (wss://) pour les pages HTTPS.
2. **Worker GPU** (RunPod ≈ 0,20-0,50 $/h) :
   `docker build -t camaivo-worker .` puis
   `docker run --gpus all -e SIGNALING_URL=wss://ton-domaine:8888 camaivo-worker`
3. **Frontend** : `VITE_SIGNALING_WS=wss://ton-domaine:8888` (variable Vercel),
   puis **Paramètres → Moteur de swap → Cloud**.

À prévoir pour la prod : un serveur **TURN** (NAT stricts), l'authentification
JWT au `join`, et 1 worker par client simultané (ou un orchestrateur).

## Notes

- **Latest-wins** : le sidecar ne met jamais les frames en file — il traite
  toujours la dernière reçue, la latence reste basse même si le GPU sature.
- Le décompte de points CamAIvo est indépendant du moteur : les heartbeats
  partent du navigateur vers Supabase quel que soit le mode.
- Protocole détaillé : `../docs/SWAP_ENGINE_PROTOCOL.md`.
