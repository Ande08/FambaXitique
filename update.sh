#!/bin/bash

# Script de atualização automática para VPS FambaXitique

echo "🚀 Iniciando atualização do sistema..."

# 1. Pull das atualizações
echo "📥 Preparando para puxar novidades do GitHub..."
# Descartar alterações locais (cuidado, mas garante que a atualização não falhe)
git reset --hard HEAD
git pull origin main

# 2. Atualizar Backend
echo "⚙️  Atualizando Backend..."
cd backend
npm install
pm2 restart fambaxitique-api || pm2 start index.js --name fambaxitique-api
cd ..

# 3. Atualizar Frontend
echo "💻 Atualizando Frontend e limpando cache..."
cd frontend
npm install
# Limpa o cache do Vite para garantir que as novas configurações de HTTPS sejam aplicadas
rm -rf node_modules/.vite
# Gera a versão de produção (caso use Nginx para servir arquivos estáticos)
echo "📦 Compilando a versão de produção..."
npm run build
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
