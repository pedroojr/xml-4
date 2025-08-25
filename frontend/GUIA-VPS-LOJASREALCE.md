# 🚀 Guia Específico - VPS lojasrealce.shop

## 📋 Informações do VPS

- **IP:** 82.29.58.242
- **Sistema:** Ubuntu 24.04 LTS
- **Status:** Em Atividade
- **Uptime:** 155 dias 6 horas
- **Localização:** Brazil - São Paulo
- **Plano:** KVM 1 (1 CPU, 4GB RAM, 50GB SSD)

## 🔧 Configuração Rápida

### **Passo 1: Conectar ao VPS**

**Opção A - SSH:**
```bash
ssh root@82.29.58.242
```

**Opção B - Terminal do Navegador:**
1. Acesse o painel do Hostinger
2. Vá em "VPS - lojasrealce.shop"
3. Clique em "Terminal do navegador"

### **Passo 2: Instalar Node.js**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### **Passo 3: Criar Diretório da Aplicação**

```bash
# Criar diretório
mkdir -p /var/www/api
cd /var/www/api

# Verificar permissões
ls -la
```

### **Passo 4: Upload dos Arquivos**

**Opção A - File Manager (Recomendado):**
1. Acesse o painel do Hostinger
2. Vá em "File Manager"
3. Navegue até `/var/www/api/`
4. Upload dos arquivos da pasta `server/`

**Opção B - SCP:**
```bash
# No seu computador local
scp -r server/* root@82.29.58.242:/var/www/api/
```

### **Passo 5: Configurar Aplicação**

```bash
# Instalar dependências
npm install

# Criar arquivo .env
nano .env
```

**Conteúdo do arquivo .env:**
```env
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://lojasrealce.shop,https://www.lojasrealce.shop
DB_PATH=/var/www/api/database.sqlite
```

### **Passo 6: Instalar e Configurar PM2**

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server-production.js --name "xml-importer-api"

# Configurar para iniciar com o sistema
pm2 startup
pm2 save

# Verificar status
pm2 status
```

### **Passo 7: Configurar Firewall**

**No painel do Hostinger:**
1. Vá em "Regras de firewall"
2. Clique em "Adicionar regra"
3. Configure:
   - **Nome:** XML Importer API
   - **Protocolo:** TCP
   - **Porta:** 3001
   - **Ação:** Permitir
   - **Direção:** Entrada

## 🌐 Configuração do Frontend

### **1. Build de Produção (Local)**

```bash
# No seu computador local
npm run build
```

### **2. Upload para Hostinger**

1. **Acesse o painel do Hostinger**
2. **Vá em "Gerenciador de Arquivos"**
3. **Navegue até `public_html/`**
4. **Faça upload de TODOS os arquivos da pasta `dist/`**

## 📊 URLs de Acesso

- **Frontend:** https://lojasrealce.shop
- **Backend:** https://82.29.58.242:3001
- **API Status:** https://82.29.58.242:3001/api/status

## 🔍 Verificação e Testes

### **1. Verificar Status da API**

```bash
# No VPS
curl http://localhost:3001/api/status

# Ou acesse no navegador
https://82.29.58.242:3001/api/status
```

### **2. Verificar Logs**

```bash
# Ver logs em tempo real
pm2 logs xml-importer-api

# Ver logs específicos
pm2 logs xml-importer-api --lines 50
```

### **3. Verificar Recursos**

```bash
# Uso de CPU e RAM
htop

# Uso de disco
df -h

# Status dos serviços
pm2 status
systemctl status nginx
```

## 🛠️ Comandos Úteis

### **Gerenciamento da Aplicação:**

```bash
# Reiniciar aplicação
pm2 restart xml-importer-api

# Parar aplicação
pm2 stop xml-importer-api

# Iniciar aplicação
pm2 start xml-importer-api

# Ver status
pm2 status

# Ver logs
pm2 logs xml-importer-api

# Monitorar recursos
pm2 monit
```

### **Gerenciamento do Sistema:**

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Verificar uso de disco
df -h

# Verificar uso de memória
free -h

# Verificar processos
ps aux | grep node
```

## 🔒 Segurança

### **1. Configurar SSL (Opcional)**

Se quiser usar HTTPS no backend:

```bash
# Instalar Certbot
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d api.lojasrealce.shop
```

### **2. Configurar Nginx (Opcional)**

```bash
# Instalar Nginx
sudo apt install nginx

# Configurar proxy reverso
sudo nano /etc/nginx/sites-available/xml-importer-api
```

**Conteúdo:**
```nginx
server {
    listen 80;
    server_name api.lojasrealce.shop;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/xml-importer-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔄 Atualizações

### **Para Atualizar o Backend:**

```bash
# No VPS
cd /var/www/api

# Fazer backup
cp database.sqlite database.sqlite.backup

# Upload dos novos arquivos
# (via File Manager ou SCP)

# Instalar dependências
npm install

# Reiniciar aplicação
pm2 restart xml-importer-api
```

### **Para Atualizar o Frontend:**

```bash
# No seu computador local
npm run build

# Upload da pasta dist/ para Hostinger
```

## 🐛 Troubleshooting

### **Problemas Comuns:**

1. **Erro de CORS:**
   - Verificar se o domínio está em `ALLOWED_ORIGINS`
   - Verificar se está usando HTTPS

2. **Erro de conexão:**
   - Verificar se a porta 3001 está aberta no firewall
   - Verificar se o PM2 está rodando: `pm2 status`

3. **Erro de permissão:**
   - Verificar permissões: `ls -la /var/www/api/`
   - Ajustar permissões: `chmod 755 /var/www/api/`

4. **Erro de banco de dados:**
   - Verificar se o arquivo database.sqlite existe
   - Verificar permissões do arquivo

### **Logs Importantes:**

```bash
# Logs da aplicação
pm2 logs xml-importer-api

# Logs do sistema
sudo journalctl -u pm2-root

# Logs do Nginx (se instalado)
sudo tail -f /var/log/nginx/error.log
```

## 📞 Suporte

### **Recursos Úteis:**
- **Hostinger Support:** https://www.hostinger.com/help
- **Documentação PM2:** https://pm2.keymetrics.io/docs/
- **Documentação Node.js:** https://nodejs.org/docs/

### **Comandos de Diagnóstico:**

```bash
# Status geral
pm2 status
systemctl status nginx
df -h
free -h

# Teste de conectividade
curl http://localhost:3001/api/status
ping 82.29.58.242

# Verificar portas
netstat -tlnp | grep :3001
```

---

## ✅ Checklist de Configuração

- [ ] Node.js instalado
- [ ] Arquivos do servidor uploadados
- [ ] Dependências instaladas
- [ ] Arquivo .env configurado
- [ ] PM2 instalado e configurado
- [ ] Aplicação iniciada
- [ ] Firewall configurado
- [ ] Frontend buildado e uploadado
- [ ] Testes realizados
- [ ] SSL configurado (opcional)

**Seu VPS está pronto para rodar o XML Importer!** 🎉
