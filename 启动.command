#!/bin/bash
# 舞光十色 一键启动
cd "$(dirname "$0")"
PORT=8991
if ! lsof -i :$PORT >/dev/null 2>&1; then
  nohup node server.mjs $PORT >/tmp/stardance_server.log 2>&1 &
  sleep 0.6
fi
open "http://localhost:$PORT/"
