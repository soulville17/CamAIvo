# Worker GPU CamAIvo — image pour RunPod / toute machine CUDA
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip libgl1 libglib2.0-0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt requirements-cloud.txt ./
RUN pip3 install --no-cache-dir -r requirements-cloud.txt

COPY camaivo_engine ./camaivo_engine
COPY cloud ./cloud
COPY download_models.py ./

# Le modèle est téléchargé au build (~530 Mo) pour un démarrage instantané
RUN python3 download_models.py

# SIGNALING_URL à fournir au run : ws://<hote-signalisation>:8888
CMD ["sh", "-c", "python3 cloud/worker.py --signaling ${SIGNALING_URL}"]
