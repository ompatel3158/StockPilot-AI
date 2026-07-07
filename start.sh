#!/bin/sh
# Start Python Kotak Neo service in the background
python3 lib/kotak-neo/service/main.py &

# Start Next.js server in the foreground
npx next start -p ${PORT:-8080}
