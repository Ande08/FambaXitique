#!/bin/bash

# Script de atualização automática para VPS FambaXitique

echo "🚀 Iniciando atualização do sistema..."

# 1. Pull das atualizações
echo "📥 Puxando novidades do GitHub..."
git pull origin main

# 2. Atualizar Backend
echo "⚙️  Atualizando Backend..."
cd backend
npm install
pm2 restart fambaxitique-api || pm2 start index.js --name fambaxitique-api
cd ..

# 3. Atualizar Frontend
echo "💻 Atualizando Frontend..."
cd frontend
npm install
# Nota: Se estiver usando o Vite como servidor na VPS (como no guia)
pm2 restart fambaxitique-ui || pm2 start "npm run dev -- --host" --name fambaxitique-ui
cd ..

# 4. Atualizar Bot Integrado
echo "🤖 Atualizando Bot Integrado..."
cd bot-integrated
npm install
pm2 restart fambaxitique-bot || pm2 start index.js --name fambaxitique-bot
cd ..

echo "✅ Sistema atualizado e reiniciado com sucesso!"
pm2 status
