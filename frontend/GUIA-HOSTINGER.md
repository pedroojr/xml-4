# 🚀 Guia Completo - Deploy no Hostinger

Este guia te ajudará a configurar o XML Importer no Hostinger e continuar atualizando por aqui.

## 📋 Pré-requisitos

- Conta no Hostinger
- Domínio configurado
- Acesso ao painel de controle

## 🔧 Configuração do Backend (API)

### **Opção 1: Hostinger VPS (Recomendado)**

1. **Contratar VPS no Hostinger:**
   - Acesse: https://www.hostinger.com/vps-hosting
   - Escolha um plano com Node.js
   - Configure seu domínio

2. **Configurar VPS:**
   ```bash
   # Conectar via SSH
   ssh root@seu-ip-vps
   
   # Instalar Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Verificar instalação
   node --version
   npm --version
   ```

3. **Deploy do Backend:**
   ```bash
   # Criar diretório
   mkdir -p /var/www/api
   cd /var/www/api
   
   # Fazer upload dos arquivos do servidor
   # (você pode usar SCP, Git ou File Manager)
   
   # Instalar dependências
   npm install
   
   # Configurar variáveis de ambiente
   nano .env
   ```

4. **Arquivo .env para produção:**
   ```env
   PORT=3001
   NODE_ENV=production
   ALLOWED_ORIGINS=https://seu-dominio.com,https://www.seu-dominio.com
   DB_PATH=/var/www/api/database.sqlite
   ```

5. **Configurar PM2 (Process Manager):**
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

6. **Configurar Nginx (Proxy Reverso):**
   ```bash
   # Instalar Nginx
   sudo apt-get install nginx
   
   # Configurar site
   sudo nano /etc/nginx/sites-available/xml-importer-api
   ```

   **Conteúdo do arquivo:**
   ```nginx
   server {
       listen 80;
       server_name api.seu-dominio.com;
       
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

### **Opção 2: Hostinger Shared Hosting (Alternativa)**

Se você não quiser VPS, pode usar serviços externos:

1. **Railway.app** (Gratuito):
   - Acesse: https://railway.app
   - Conecte seu GitHub
   - Deploy automático do backend

2. **Render.com** (Gratuito):
   - Acesse: https://render.com
   - Conecte seu GitHub
   - Deploy automático do backend

3. **Heroku** (Pago):
   - Acesse: https://heroku.com
   - Conecte seu GitHub
   - Deploy automático do backend

## 🌐 Configuração do Frontend (Hostinger)

### **1. Build de Produção:**
```bash
# No seu computador local
npm run build
```

### **2. Upload para Hostinger:**

1. **Acesse o painel do Hostinger**
2. **Vá em "Gerenciador de Arquivos"**
3. **Navegue até `public_html/`**
4. **Faça upload de todos os arquivos da pasta `dist/`**

### **3. Configurar API URL:**

Crie um arquivo `.env.production` no seu projeto local:
```env
VITE_API_URL=https://api.seu-dominio.com/api
```

### **4. Rebuild e Upload:**
```bash
# Rebuild com nova configuração
npm run build

# Upload novamente para Hostinger
```

## 🔄 Fluxo de Atualizações

### **Para Atualizar o Sistema:**

1. **Desenvolver localmente** (como você já faz)
2. **Testar** no ambiente local
3. **Build de produção:**
   ```bash
   npm run build
   ```
4. **Upload para Hostinger** (apenas pasta `dist/`)
5. **Backend** (se necessário):
   ```bash
   # No VPS
   cd /var/www/api
   git pull origin main
   npm install
   pm2 restart xml-importer-api
   ```

## 📁 Estrutura de Arquivos

### **Local (Desenvolvimento):**
```
xml-importer-v3.1/
├── src/                    # Código fonte
├── server/                 # Backend local
├── dist/                   # Build de produção
└── package.json
```

### **Hostinger (Produção):**
```
public_html/
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── .htaccess
```

### **VPS (Backend):**
```
/var/www/api/
├── server-production.js
├── package.json
├── database.sqlite
└── .env
```

## 🔒 Configurações de Segurança

### **1. SSL/HTTPS:**
- Ative SSL no painel do Hostinger
- Configure redirecionamento HTTP → HTTPS

### **2. CORS:**
```javascript
// No backend
app.use(cors({
  origin: ['https://seu-dominio.com', 'https://www.seu-dominio.com'],
  credentials: true
}));
```

### **3. Headers de Segurança:**
```javascript
// Já configurado no server-production.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.sefaz.gov.br"],
    },
  },
}));
```

## 🚀 Scripts Automatizados

### **1. Script de Deploy:**
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Iniciando deploy..."

# Build
echo "📦 Criando build..."
npm run build

# Upload via FTP (se configurado)
echo "📤 Fazendo upload..."
# lftp -c "open -u usuario,senha ftp.seu-dominio.com; mirror -R dist/ public_html/"

echo "✅ Deploy concluído!"
```

### **2. Script de Backup:**
```bash
#!/bin/bash
# backup.sh

echo "💾 Criando backup..."

# Backup do banco
cp /var/www/api/database.sqlite /backup/database-$(date +%Y%m%d).sqlite

# Backup do código
tar -czf /backup/code-$(date +%Y%m%d).tar.gz /var/www/api/

echo "✅ Backup concluído!"
```

## 📊 Monitoramento

### **1. Logs do Backend:**
```bash
# Ver logs em tempo real
pm2 logs xml-importer-api

# Ver status
pm2 status
```

### **2. Logs do Nginx:**
```bash
# Logs de acesso
sudo tail -f /var/log/nginx/access.log

# Logs de erro
sudo tail -f /var/log/nginx/error.log
```

### **3. Monitoramento de Recursos:**
```bash
# Uso de CPU e RAM
htop

# Uso de disco
df -h
```

## 🐛 Troubleshooting

### **Problemas Comuns:**

1. **Erro de CORS:**
   - Verificar se o domínio está em `ALLOWED_ORIGINS`
   - Verificar se está usando HTTPS

2. **Erro de conexão com API:**
   - Verificar se o backend está rodando: `pm2 status`
   - Verificar logs: `pm2 logs xml-importer-api`

3. **Erro de build:**
   - Limpar cache: `npm run build -- --force`
   - Verificar dependências: `npm install`

4. **Erro de upload:**
   - Verificar permissões de pasta
   - Verificar limite de upload no servidor

## 📞 Suporte

### **Recursos Úteis:**
- **Hostinger Support**: https://www.hostinger.com/help
- **Documentação PM2**: https://pm2.keymetrics.io/docs/
- **Documentação Nginx**: https://nginx.org/en/docs/

### **Comandos Úteis:**
```bash
# Reiniciar backend
pm2 restart xml-importer-api

# Ver logs
pm2 logs xml-importer-api

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar status dos serviços
sudo systemctl status nginx
pm2 status
```

---

## ✅ Checklist de Deploy

- [ ] VPS configurado
- [ ] Node.js instalado
- [ ] Backend deployado
- [ ] PM2 configurado
- [ ] Nginx configurado
- [ ] SSL ativado
- [ ] Frontend buildado
- [ ] Upload para Hostinger
- [ ] API URL configurada
- [ ] Testes realizados
- [ ] Backup configurado

**Agora você pode continuar desenvolvendo localmente e fazer deploy facilmente no Hostinger!** 🎉
