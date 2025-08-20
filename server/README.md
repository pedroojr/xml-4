# XML Importer - Servidor Backend

Este é o servidor backend para o XML Importer, que fornece uma API REST para gerenciar NFEs e produtos.

## 🚀 Funcionalidades

- **Banco de Dados SQLite**: Armazenamento local e eficiente
- **API REST**: Endpoints para CRUD de NFEs e produtos
- **Upload de XML**: Processamento de arquivos XML de NF-e
- **CORS Configurado**: Acesso remoto de outros PCs
- **Segurança**: Helmet para proteção básica

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn

## 🔧 Instalação

1. **Instalar dependências:**
   ```bash
   cd server
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   # Copiar arquivo de exemplo
   copy env.example .env
   
   # Editar .env com suas configurações
   ```

3. **Iniciar servidor:**
   ```bash
   npm run dev
   ```

## 🌐 Configuração para Acesso Remoto

### 1. Descobrir IP da máquina:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

### 2. Configurar firewall:
- Abrir porta 3001 no firewall do Windows
- Permitir conexões TCP na porta 3001

### 3. Configurar CORS no .env:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://192.168.1.100:5173,http://192.168.1.101:5173
```

### 4. Acessar de outros PCs:
```
http://[SEU_IP]:3001/api/status
```

## 📊 Endpoints da API

### NFEs
- `GET /api/nfes` - Listar todas as NFEs
- `GET /api/nfes/:id` - Buscar NFE por ID
- `POST /api/nfes` - Criar/atualizar NFE
- `PUT /api/nfes/:id` - Atualizar NFE
- `DELETE /api/nfes/:id` - Excluir NFE

### Upload
- `POST /api/upload-xml` - Upload de arquivo XML

### Status
- `GET /api/status` - Status do servidor

## 🗄️ Estrutura do Banco de Dados

### Tabela: nfes
- `id` (TEXT, PRIMARY KEY)
- `data` (TEXT)
- `numero` (TEXT)
- `chaveNFE` (TEXT)
- `fornecedor` (TEXT)
- `valor` (REAL)
- `itens` (INTEGER)
- `impostoEntrada` (REAL)
- `xapuriMarkup` (REAL)
- `epitaMarkup` (REAL)
- `roundingType` (TEXT)
- `valorFrete` (REAL)
- `isFavorite` (BOOLEAN)
- `createdAt` (DATETIME)
- `updatedAt` (DATETIME)

### Tabela: produtos
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `nfeId` (TEXT, FOREIGN KEY)
- `codigo` (TEXT)
- `descricao` (TEXT)
- `ncm` (TEXT)
- `cfop` (TEXT)
- `unidade` (TEXT)
- `quantidade` (REAL)
- `valorUnitario` (REAL)
- `valorTotal` (REAL)
- `baseCalculoICMS` (REAL)
- `valorICMS` (REAL)
- `aliquotaICMS` (REAL)
- `baseCalculoIPI` (REAL)
- `valorIPI` (REAL)
- `aliquotaIPI` (REAL)
- `ean` (TEXT)
- `reference` (TEXT)
- `brand` (TEXT)
- `imageUrl` (TEXT)
- `descricao_complementar` (TEXT)
- `custoExtra` (REAL)
- `freteProporcional` (REAL)

## 🔒 Segurança

- **CORS**: Configurado para permitir apenas origens específicas
- **Helmet**: Headers de segurança básicos
- **Validação**: Validação de entrada nos endpoints
- **Rate Limiting**: Pode ser adicionado se necessário

## 📝 Scripts Disponíveis

- `npm start` - Iniciar servidor em produção
- `npm run dev` - Iniciar servidor em desenvolvimento com nodemon

## 🐛 Troubleshooting

### Erro de CORS
- Verificar se o IP está na lista `ALLOWED_ORIGINS`
- Verificar se o frontend está usando a URL correta

### Erro de conexão
- Verificar se a porta 3001 está aberta no firewall
- Verificar se o servidor está rodando

### Erro de banco de dados
- Verificar se o arquivo `database.sqlite` tem permissões de escrita
- Verificar se o diretório tem permissões adequadas

## 📞 Suporte

Para problemas ou dúvidas, verifique:
1. Logs do console do servidor
2. Status da API: `http://localhost:3001/api/status`
3. Configurações no arquivo `.env` 