#!/bin/bash
# Deploy the static frontend to an EC2 instance via SSH.
# Usage: ./deploy.sh <ec2-user@host> [--key /path/to/key.pem]
#
# Requirements on EC2: Docker installed and running.

set -e

HOST=$1
KEY_OPT=""
if [ "$2" = "--key" ] && [ -n "$3" ]; then
  KEY_OPT="-i $3"
fi

if [ -z "$HOST" ]; then
  echo "Usage: ./deploy.sh <ec2-user@host> [--key /path/to/key.pem]"
  exit 1
fi

echo "==> Building Docker image..."
docker build -f packages/client/Dockerfile -t rtsp-player-web .

echo "==> Saving image..."
docker save rtsp-player-web | gzip > /tmp/rtsp-player-web.tar.gz

echo "==> Uploading to $HOST..."
scp $KEY_OPT /tmp/rtsp-player-web.tar.gz "$HOST:/tmp/"

echo "==> Deploying on EC2..."
ssh $KEY_OPT "$HOST" << 'EOF'
  docker load < /tmp/rtsp-player-web.tar.gz
  docker stop rtsp-player-web 2>/dev/null || true
  docker rm rtsp-player-web 2>/dev/null || true
  docker run -d --name rtsp-player-web --restart unless-stopped -p 80:80 rtsp-player-web
  rm /tmp/rtsp-player-web.tar.gz
EOF

rm /tmp/rtsp-player-web.tar.gz
echo "==> Done. Open http://$HOST in your browser."
