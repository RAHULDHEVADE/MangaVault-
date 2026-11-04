#!/bin/bash
clear
echo "Starting MangaVault Server..."
termux-wake-lock

# 1. Start Node
node server.js > server.log 2>&1 &
sleep 1

# 2. Start Cloudflare Tunnel
echo "Starting Cloudflare Tunnel..."
cloudflared tunnel --url http://localhost:3000 > tunnel.log 2>&1 &

# 3. Wait for the URL
echo "Waiting for Tunnel URL..."
URL=""
while [ -z "$URL" ]; do
  sleep 1
  URL=$(grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' tunnel.log | head -n 1)
done

# 4. Print the clean output
clear
echo "=================================================="
echo "✅ MangaVault is LIVE at:"
echo ""
echo "   $URL"
echo ""
echo "🔑 Username: admin"
echo "🔑 Password: mangavault123"
echo "=================================================="
echo ""
echo "Opening in your default browser..."

# 5. Auto-open the browser
termux-open-url "$URL"

echo "Press Ctrl+C to stop the server."

# Keep script running
wait
