#!/bin/bash

# Configurações
SERVER="u461960397@82.29.58.242"
PORT="22"
REMOTE_DIR="/home/u461960397/xml-4"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${GREEN}Iniciando deploy...${NC}"

# Construir o frontend
echo "${GREEN}Construindo o frontend...${NC}"
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "${RED}Erro ao construir o frontend${NC}"
    exit 1
fi

# Criar diretórios necessários no servidor
echo "${GREEN}Criando diretórios no servidor...${NC}"
ssh -p $PORT $SERVER "mkdir -p $REMOTE_DIR/{data,backups,uploads,logs}"

# Copiar arquivos para o servidor
echo "${GREEN}Copiando arquivos para o servidor...${NC}"

# Frontend
echo "Copiando frontend..."
rsync -avz --delete -e "ssh -p $PORT" dist/ $SERVER:$REMOTE_DIR/frontend/

# Backend
echo "Copiando backend..."
cd ../server
rsync -avz --delete --exclude 'node_modules' --exclude 'data' --exclude 'backups' --exclude 'uploads' --exclude 'logs' -e "ssh -p $PORT" . $SERVER:$REMOTE_DIR/server/

# Copiar arquivo de configuração de produção
echo "Copiando configurações de produção..."
scp -P $PORT .env.production $SERVER:$REMOTE_DIR/server/.env

# Instalar dependências e reiniciar servidor
echo "${GREEN}Instalando dependências e reiniciando servidor...${NC}"
ssh -p $PORT $SERVER "cd $REMOTE_DIR/server && npm install --production && pm2 restart xml-processor || pm2 start server.js --name xml-processor"

echo "${GREEN}Deploy concluído com sucesso!${NC}"