#!/bin/bash
set -e

echo "[VPS SETUP] Installing Docker & Git..."
apt-get update && apt-get install -y git curl
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt-get install -y docker-compose-plugin

echo "[VPS SETUP] Cloning Plagiarisme Platform Repository..."
rm -rf plagiarisme-platform
git clone https://github.com/Syibil-itind/plagiarisme-platform.git
cd plagiarisme-platform

echo "[VPS SETUP] Building & Starting Docker Containers..."
docker compose up -d --build

echo "[VPS SETUP] SUCCESS! Your Plagiarisme Platform is now live 24/7!"
