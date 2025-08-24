# Persistência de Itens Ocultos (hiddenItems)

## Contrato de API
- Campo: `hiddenItems: string[]` em `NFE`
- Semântica: lista de IDs estáveis (string) de itens ocultos por NF
- Regras do backend:
  - `PUT /api/nfes/:id` grava `hiddenItems` com `JSON.stringify`
  - `GET /api/nfes/:id` retorna `hiddenItems` como array (via `JSON.parse`), fallback `[]`
  - Updates parciais preservam `hiddenItems` quando não enviados no body

## Fluxo no frontend
1. Carregar: obter `NFE` do servidor e ler `hiddenItems`
2. Aplicar: filtrar itens cujo ID está em `hiddenItems`
3. Render: exibir lista principal sem ocultos; visão "apenas ocultados" mostra os ocultos
4. Toggle: ao ocultar/desocultar, calcular `nextHiddenItems` e enviar `PUT` com o array atualizado
5. Fonte única: servidor (IDs estáveis string em todo pipeline)

## IDs estáveis (string)
Preferência de composição
- EAN se existir
- senão `cod:${codigo}:${index}`
- senão `ref:${reference}:${index}`

## Testes
### Integração
1. `PUT` `hiddenItems` → `GET` deve bater
2. `PUT` parcial (ex.: `valorFrete`) → `GET` mantém `hiddenItems`

### E2E (com Playwright/Cypress)
1. Ocultar 2 itens → reload → continuam ocultos
2. Desocultar 1 → reload → apenas ele volta; o outro segue oculto

## Observabilidade
- Logs DB (DB_OPEN/NFES_COLUMNS) condicionais a `DEBUG_DB=true` (off por padrão)
- Logs essenciais de request/erro permanecem


