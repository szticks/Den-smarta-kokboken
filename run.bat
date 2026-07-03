@echo off
title Smarta Kokboken Local Server
echo ====================================================
echo Starting Smarta Kokboken PWA local dev server...
echo Access the app at: http://localhost:8000
echo Close this window to stop the server.
echo ====================================================
start "" "http://localhost:8000"
python -m http.server 8000
