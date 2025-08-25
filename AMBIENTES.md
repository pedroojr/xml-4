# 🌍 Ambientes de Desenvolvimento e Produção

## 📋 **Visão Geral**

Este projeto suporta múltiplos ambientes para desenvolvimento, teste e produção:

### **🏭 Produção (Atual)**
- **Frontend**: https://xml.lojasrealce.shop/
- **Backend**: https://api.xml.lojasrealce.shop/
- **Porta Backend**: 3001
- **Diretório**: `/var/www/html`

### **🧪 Desenvolvimento/Teste**
- **Frontend**: https://dev.xml.lojasrealce.shop/
- **Backend**: https://dev-api.xml.lojasrealce.shop/
- **Porta Backend**: 3002
- **Diretório**: `/var/www/dev`

## 🚀 **Como Usar**

### **1. Desenvolvimento Local**
```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para desenvolvimento
npm run build:dev

# Build para produção
npm run build:prod
```

### **2. Deploy para Desenvolvimento**
```bash
# Fazer push para branch develop
git checkout develop
git add .
git commit -m "feat: nova funcionalidade"
git push origin develop

# O GitHub Actions fará deploy automático para:
# https://dev.xml.lojasrealce.shop/
```

### **3. Deploy para Produção**
```bash
# Fazer push para branch master
git checkout master
git add .
git commit -m "feat: nova funcionalidade"
git push origin master

# O GitHub Actions fará deploy automático para:
# https://xml.lojasrealce.shop/
```

## 🔧 **Configuração dos Ambientes**

### **Variáveis de Ambiente**

#### **Desenvolvimento**
```bash
VITE_API_URL=https://dev-api.xml.lojasrealce.shop
VITE_ENV=development
```

#### **Produção**
```bash
VITE_API_URL=https://api.xml.lojasrealce.shop
VITE_ENV=production
```

### **Portas dos Backends**
- **Desenvolvimento**: 3002
- **Produção**: 3001

## 📁 **Estrutura de Diretórios**

```
/var/www/
├── html/          # Produção
│   ├── index.html
│   └── assets/
└── dev/           # Desenvolvimento
    ├── index.html
    └── assets/
```

## 🎯 **Workflows do GitHub Actions**

### **Deploy Frontend (Produção)**
- **Trigger**: Push para `master`
- **Target**: `/var/www/html`
- **URL**: https://xml.lojasrealce.shop/

### **Deploy Desenvolvimento**
- **Trigger**: Push para `develop` ou `dev`
- **Target**: `/var/www/dev`
- **URL**: https://dev.xml.lojasrealce.shop/

### **Provisionamento**
- **Provision API**: Configura produção
- **Provision Frontend**: Configura produção
- **Provision Dev**: Configura desenvolvimento

## 🔍 **Como Testar**

### **1. Testar Produção**
```bash
# Frontend
curl -k https://xml.lojasrealce.shop/

# API
curl -k https://api.xml.lojasrealce.shop/api/status
```

### **2. Testar Desenvolvimento**
```bash
# Frontend
curl -k https://dev.xml.lojasrealce.shop/

# API
curl -k https://dev-api.xml.lojasrealce.shop/api/status
```

## 🚨 **Importante**

- **Desenvolvimento**: Use para testar novas funcionalidades
- **Produção**: Use apenas para código estável e testado
- **Sempre teste em desenvolvimento antes de fazer deploy para produção**
- **Use branches separadas**: `develop` para dev, `master` para produção

## 📞 **Suporte**

Se precisar de ajuda:
1. Verifique os logs do GitHub Actions
2. Teste os endpoints manualmente
3. Verifique o status dos serviços no servidor
