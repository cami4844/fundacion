#!/usr/bin/env bash
# ============================================================
#  Arranca el servidor de la Fundación Red Con Ciencia (V6)
#  Requisito: Node.js 22 o superior (https://nodejs.org)
#  Uso:  ./iniciar-servidor.sh   (o:  node server.js)
# ============================================================
cd "$(dirname "$0")"
echo ""
echo "  Iniciando la Fundación Red Con Ciencia..."
echo ""
node server.js
