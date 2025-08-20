# XML Importer v3.1 - Sistema Completo com Banco de Dados

Sistema completo para importação e gerenciamento de produtos via XML de NF-e, com banco de dados SQLite e acesso remoto.

## 🚀 Funcionalidades

### Frontend (React + TypeScript)
- ✅ **Upload de XML** de NF-e
- ✅ **Consulta SEFAZ** direta
- ✅ **Upload de PDF** com extração de dados
- ✅ **Visualização de produtos** com filtros avançados
- ✅ **Análise de preços** e markup
- ✅ **Interface responsiva** e moderna
- ✅ **Busca por descrição complementar**

### Backend (Node.js + Express + SQLite)
- ✅ **API REST completa** para CRUD de NFEs
- ✅ **Banco de dados SQLite** persistente
- ✅ **Upload de arquivos XML**
- ✅ **CORS configurado** para acesso remoto
- ✅ **Segurança** com Helmet
- ✅ **Logs detalhados** para debugging

### Acesso Remoto
- ✅ **Configuração automática** de firewall
- ✅ **Acesso via IP local** (192.168.31.240)
- ✅ **Status de conexão** em tempo real
- ✅ **Sincronização** entre múltiplos PCs

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Windows 10/11 (para scripts .bat)

## 🔧 Instalação e Configuração

### 1. **Instalação Rápida (Recomendado)**
```bash
# Clonar ou baixar o projeto
cd xml-importer-v3.1

# Instalar dependências do frontend
npm install

# Instalar dependências do backend
cd server
npm install
cd ..

# Iniciar sistema completo
start-all.bat
```

### 2. **Instalação Manual**

#### Frontend:
```bash
npm install
npm run dev
```

#### Backend:
```bash
cd server
npm install
npm run dev
```

## 🌐 Configuração para Acesso Remoto

### **IP da Máquina: 192.168.31.240**

### **URLs de Acesso:**

#### **Local (mesmo PC):**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- API Status: `http://localhost:3001/api/status`

#### **Rede Local (outros PCs):**
- Frontend: `http://192.168.31.240:5173`
- Backend: `http://192.168.31.240:3001`
- API Status: `http://192.168.31.240:3001/api/status`

### **Configuração Automática:**
O sistema já está configurado para acesso remoto. Se necessário:

1. **Verificar firewall:**
   ```bash
   cd server
   configure-firewall.bat
   ```

2. **Descobrir IP:**
   ```bash
   cd server
   get-ip.bat
   ```

## 📊 Estrutura do Banco de Dados

### **Tabela: nfes**
- `id` (TEXT, PRIMARY KEY)
- `data` (TEXT) - Data da NFE
- `numero` (TEXT) - Número da NFE
- `chaveNFE` (TEXT) - Chave de acesso
- `fornecedor` (TEXT) - Nome do fornecedor
- `valor` (REAL) - Valor total
- `itens` (INTEGER) - Quantidade de itens
- `impostoEntrada` (REAL) - Imposto de entrada (%)
- `xapuriMarkup` (REAL) - Markup Xapuri (%)
- `epitaMarkup` (REAL) - Markup Epita (%)
- `roundingType` (TEXT) - Tipo de arredondamento
- `valorFrete` (REAL) - Valor do frete
- `isFavorite` (BOOLEAN) - Favorito
- `createdAt` (DATETIME) - Data de criação
- `updatedAt` (DATETIME) - Data de atualização

### **Tabela: produtos**
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `nfeId` (TEXT, FOREIGN KEY) - Referência à NFE
- `codigo` (TEXT) - Código do produto
- `descricao` (TEXT) - Descrição do produto
- `ncm` (TEXT) - Classificação fiscal
- `cfop` (TEXT) - CFOP
- `unidade` (TEXT) - Unidade de medida
- `quantidade` (REAL) - Quantidade
- `valorUnitario` (REAL) - Valor unitário
- `valorTotal` (REAL) - Valor total
- `baseCalculoICMS` (REAL) - Base de cálculo ICMS
- `valorICMS` (REAL) - Valor ICMS
- `aliquotaICMS` (REAL) - Alíquota ICMS
- `baseCalculoIPI` (REAL) - Base de cálculo IPI
- `valorIPI` (REAL) - Valor IPI
- `aliquotaIPI` (REAL) - Alíquota IPI
- `ean` (TEXT) - Código EAN
- `reference` (TEXT) - Referência
- `brand` (TEXT) - Marca
- `imageUrl` (TEXT) - URL da imagem
- `descricao_complementar` (TEXT) - Descrição complementar
- `custoExtra` (REAL) - Custo extra
- `freteProporcional` (REAL) - Frete proporcional

## 🔌 Endpoints da API

### **NFEs**
- `GET /api/nfes` - Listar todas as NFEs
- `GET /api/nfes/:id` - Buscar NFE por ID
- `POST /api/nfes` - Criar/atualizar NFE
- `PUT /api/nfes/:id` - Atualizar NFE
- `DELETE /api/nfes/:id` - Excluir NFE

### **Upload**
- `POST /api/upload-xml` - Upload de arquivo XML

### **Status**
- `GET /api/status` - Status do servidor

## 🛠️ Scripts Disponíveis

### **Sistema Completo:**
- `start-all.bat` - Inicia frontend e backend simultaneamente

### **Backend:**
- `server/install.bat` - Instala dependências do servidor
- `server/start.bat` - Inicia servidor backend
- `server/configure-firewall.bat` - Configura firewall
- `server/get-ip.bat` - Descobre IP da máquina

### **NPM Scripts:**
- `npm run dev` - Inicia frontend em desenvolvimento
- `npm run build` - Build de produção
- `npm run preview` - Preview do build

## 🔒 Segurança

- **CORS configurado** para origens específicas
- **Helmet** para headers de segurança
- **Validação** de entrada nos endpoints
- **Firewall** configurado automaticamente
- **Logs** detalhados para auditoria

## 📱 Interface do Usuário

### **Indicadores de Status:**
- 🟢 **Servidor Online** - Conexão ativa
- 🔴 **Servidor Offline** - Sem conexão
- 🟡 **Verificando...** - Testando conexão

### **Funcionalidades:**
- **Upload múltiplo** de arquivos XML
- **Filtros avançados** por produto
- **Análise de preços** com gráficos
- **Exportação** de dados
- **Favoritos** para NFEs importantes

## 🐛 Troubleshooting

### **Erro de CORS:**
- Verificar se o IP está na lista `ALLOWED_ORIGINS`
- Verificar se o frontend está usando a URL correta

### **Erro de conexão:**
- Verificar se a porta 3001 está aberta no firewall
- Verificar se o servidor está rodando
- Executar `server/configure-firewall.bat`

### **Erro de banco de dados:**
- Verificar se o arquivo `database.sqlite` tem permissões
- Verificar se o diretório tem permissões adequadas

### **Porta 5173 em uso:**
- Parar processos Node.js: `taskkill //f //im node.exe`
- Reiniciar o sistema

## 📞 Suporte

### **Verificações Básicas:**
1. Status da API: `http://localhost:3001/api/status`
2. Logs do console do servidor
3. Configurações no arquivo `server/.env`

### **Logs Importantes:**
- Frontend: Console do navegador
- Backend: Terminal do servidor
- Banco: Arquivo `server/database.sqlite`

## 🚀 Próximas Funcionalidades

- [ ] **Backup automático** do banco de dados
- [ ] **Sincronização** em tempo real
- [ ] **Relatórios** avançados
- [ ] **Integração** com sistemas externos
- [ ] **Autenticação** de usuários
- [ ] **Backup na nuvem**

---

**Sistema desenvolvido para importação e gerenciamento eficiente de produtos via XML de NF-e com acesso remoto completo.**
