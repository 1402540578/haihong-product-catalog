#!/usr/bin/env sh
set -e
cd "$(dirname "$0")"
python3 -m pip install -r scripts/requirements.txt
python3 scripts/build_catalog.py
echo "请打开：http://127.0.0.1:8000/"
python3 -m http.server 8000 --directory _site
