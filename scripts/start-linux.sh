#!/bin/bash
set -e
docker compose up --build -d
echo "SPC app running at http://localhost:8000"
