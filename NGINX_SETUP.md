# Configuração do Nginx Proxy Reverso

Este documento explica como configurar o nginx para resolver o problema de Mixed Content (HTTPS frontend tentando acessar HTTP backend).

## Problema

O frontend está sendo servido via HTTPS, mas a API backend está rodando apenas em HTTP na porta 3001. Navegadores modernos bloqueiam requisições HTTP de páginas HTTPS por segurança (Mixed Content).

## Solução

Configurar um proxy reverso nginx que:
1. Recebe requisições HTTPS na porta 443 para `/api/*`
2. Encaminha para o backend HTTP na porta 3001
3. Retorna as respostas via HTTPS

## Passos para Implementação

### 1. Copiar Configuração

Copie o arquivo `nginx-api-proxy.conf` para o diretório de configuração do nginx:

```bash
# No servidor (Ubuntu/Debian)
sudo cp nginx-api-proxy.conf /etc/nginx/sites-available/xml-api-proxy
sudo ln -s /etc/nginx/sites-available/xml-api-proxy /etc/nginx/sites-enabled/

# Ou adicione ao arquivo principal
sudo cp nginx-api-proxy.conf /etc/nginx/conf.d/xml-api-proxy.conf
```

### 2. Atualizar Caminhos dos Certificados SSL

Edite o arquivo de configuração e atualize os caminhos dos certificados SSL:

```nginx
ssl_certificate /path/to/ssl/certificate.crt;  # Caminho real do certificado
ssl_certificate_key /path/to/ssl/private.key;  # Caminho real da chave privada
```

### 3. Testar Configuração

```bash
# Testar sintaxe
sudo nginx -t

# Se OK, recarregar nginx
sudo systemctl reload nginx
```

### 4. Verificar Funcionamento

```bash
# Testar API via HTTPS
curl -k https://xml.lojasrealce.shop/api/status

# Deve retornar: {"status":"online","database":"connected","environment":"production"}
```

## Configuração Atual

- **Frontend**: `https://xml.lojasrealce.shop` (porta 443)
- **API via Proxy**: `https://xml.lojasrealce.shop/api/*` (porta 443 → proxy → porta 3001)
- **Backend Direto**: `http://xml.lojasrealce.shop:3001/api/*` (apenas interno)

## Benefícios

1. ✅ Resolve Mixed Content Security
2. ✅ API acessível via HTTPS
3. ✅ Mantém backend HTTP simples
4. ✅ CORS configurado corretamente
5. ✅ Headers de segurança adequados

## Troubleshooting

### Erro 502 Bad Gateway
- Verificar se o backend está rodando na porta 3001
- Verificar logs: `sudo tail -f /var/log/nginx/error.log`

### Erro SSL
- Verificar caminhos dos certificados
- Verificar permissões dos arquivos de certificado

### CORS Errors
- Verificar se `ALLOWED_ORIGINS` no backend inclui `https://xml.lojasrealce.shop`
- Verificar headers CORS na configuração nginx

## Próximos Passos

1. Implementar esta configuração no servidor
2. Fazer deploy das mudanças no `.env.production`
3. Testar a aplicação completa
4. Monitorar logs para garantir funcionamento correto