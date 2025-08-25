# 🚀 Guia Completo - Subdomínio xml.lojasrealce.shop

## 📋 Configuração do Subdomínio

### **Informações:**
- **Subdomínio:** xml.lojasrealce.shop
- **VPS:** 82.29.58.242
- **Backend:** Porta 3001
- **Frontend:** Pasta xml/ no Hostinger

## 🔧 Passo a Passo

### **Passo 1: Criar Subdomínio no Hostinger**

1. **Acesse o painel do Hostinger**
2. **Vá em "Domínios"**
3. **Clique em "Gerenciar" no domínio lojasrealce.shop**
4. **Vá em "Subdomínios"**
5. **Clique em "Criar Subdomínio"**
6. **Configure:**
   - **Nome:** xml
   - **Diretório:** public_html/xml
   - **Clique em "Criar"**

### **Passo 2: Configurar Backend no VPS**

**Conectar ao VPS:**
```bash
ssh root@82.29.58.242
```

**Atualizar configuração:**
```bash
cd /var/www/api
nano .env
```

**Conteúdo do arquivo .env:**
```env
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://xml.lojasrealce.shop,https://www.xml.lojasrealce.shop
DB_PATH=/var/www/api/database.sqlite
```

**Reiniciar aplicação:**
```bash
pm2 restart xml-importer-api
pm2 status
```

### **Passo 3: Build de Produção (Local)**

```bash
# No seu computador local
npm run build
```

### **Passo 4: Upload para Subdomínio**

1. **Acesse o painel do Hostinger**
2. **Vá em "Gerenciador de Arquivos"**
3. **Navegue até `public_html/xml/`**
4. **Faça upload de TODOS os arquivos da pasta `dist/`**

### **Passo 5: Configurar .htaccess**

**Criar arquivo `.htaccess` na pasta `public_html/xml/`:**

```apache
# Configuração para XML Importer no Subdomínio

# Ativar compressão GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache de arquivos estáticos
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresByType application/pdf "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Headers de segurança
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
</IfModule>

# Configuração para SPA (Single Page Application)
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Redirecionar HTTP para HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Se o arquivo/diretório não existe, redirecionar para index.html
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Configuração de MIME types
<IfModule mod_mime.c>
    AddType application/javascript .js
    AddType text/css .css
    AddType image/svg+xml .svg
    AddType application/font-woff .woff
    AddType application/font-woff2 .woff2
</IfModule>

# Desabilitar listagem de diretórios
Options -Indexes

# Proteger arquivos sensíveis
<Files ".env*">
    Order allow,deny
    Deny from all
</Files>

<Files "*.log">
    Order allow,deny
    Deny from all
</Files>
```

## 📊 URLs de Acesso

- **Frontend:** https://xml.lojasrealce.shop
- **Backend:** https://82.29.58.242:3001
- **API Status:** https://82.29.58.242:3001/api/status

## 🔍 Verificação e Testes

### **1. Testar Subdomínio**

```bash
# Verificar se o subdomínio está funcionando
curl -I https://xml.lojasrealce.shop

# Verificar se a API está acessível
curl https://82.29.58.242:3001/api/status
```

### **2. Verificar Logs**

```bash
# No VPS
pm2 logs xml-importer-api

# Ver logs específicos
pm2 logs xml-importer-api --lines 50
```

### **3. Verificar CORS**

No navegador, abra o Console (F12) e verifique se não há erros de CORS ao acessar https://xml.lojasrealce.shop

## 🛠️ Comandos Úteis

### **Gerenciamento da Aplicação:**

```bash
# Reiniciar aplicação
pm2 restart xml-importer-api

# Ver status
pm2 status

# Ver logs
pm2 logs xml-importer-api

# Monitorar recursos
pm2 monit
```

### **Gerenciamento do Subdomínio:**

```bash
# Verificar DNS
nslookup xml.lojasrealce.shop

# Testar conectividade
ping xml.lojasrealce.shop

# Verificar SSL
openssl s_client -connect xml.lojasrealce.shop:443
```

## 🔄 Atualizações

### **Para Atualizar o Frontend:**

```bash
# No seu computador local
npm run build

# Upload da pasta dist/ para public_html/xml/
```

### **Para Atualizar o Backend:**

```bash
# No VPS
cd /var/www/api
pm2 restart xml-importer-api
```

## 🐛 Troubleshooting

### **Problemas Comuns:**

1. **Subdomínio não carrega:**
   - Verificar se foi criado corretamente no Hostinger
   - Verificar se os arquivos estão na pasta correta
   - Aguardar propagação do DNS (pode levar até 24h)

2. **Erro de CORS:**
   - Verificar se o subdomínio está em `ALLOWED_ORIGINS`
   - Verificar se está usando HTTPS
   - Reiniciar o backend: `pm2 restart xml-importer-api`

3. **Erro 404:**
   - Verificar se o arquivo `index.html` está na pasta correta
   - Verificar se o `.htaccess` está configurado
   - Verificar permissões dos arquivos

4. **Erro de SSL:**
   - Ativar SSL no painel do Hostinger
   - Verificar se o certificado está válido
   - Aguardar propagação do certificado

### **Logs Importantes:**

```bash
# Logs da aplicação
pm2 logs xml-importer-api

# Logs do Apache (se disponível)
tail -f /var/log/apache2/error.log

# Logs do Nginx (se instalado)
tail -f /var/log/nginx/error.log
```

## 📞 Suporte

### **Recursos Úteis:**
- **Hostinger Support:** https://www.hostinger.com/help
- **Documentação Subdomínios:** https://www.hostinger.com/tutorials/how-to-create-subdomain
- **Documentação SSL:** https://www.hostinger.com/tutorials/ssl

### **Comandos de Diagnóstico:**

```bash
# Status geral
pm2 status
curl -I https://xml.lojasrealce.shop
curl https://82.29.58.242:3001/api/status

# Verificar DNS
dig xml.lojasrealce.shop
nslookup xml.lojasrealce.shop

# Verificar portas
netstat -tlnp | grep :3001
```

---

## ✅ Checklist de Configuração

- [ ] Subdomínio criado no Hostinger
- [ ] Backend configurado com novo CORS
- [ ] Frontend buildado
- [ ] Upload para pasta xml/
- [ ] .htaccess configurado
- [ ] SSL ativado
- [ ] Testes realizados
- [ ] Logs verificados

**Seu subdomínio xml.lojasrealce.shop está pronto!** 🎉

## 🚀 **Próximos Passos:**

1. **Criar subdomínio** no painel do Hostinger
2. **Executar** `deploy-subdominio.bat`
3. **Upload** dos arquivos para `public_html/xml/`
4. **Configurar backend** no VPS
5. **Testar** a aplicação

**O XML Importer estará disponível em https://xml.lojasrealce.shop** 🌐
