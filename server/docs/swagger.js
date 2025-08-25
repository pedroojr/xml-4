import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XML Importer API',
      version: '1.0.0',
      description: 'Documentação da API do XML Importer',
    },
    servers: [
      {
        url: '/api',
      },
    ],
    paths: {
      '/nfes': {
        get: {
          summary: 'Listar todas as NFEs',
          responses: {
            200: { description: 'Lista de NFEs' },
          },
        },
        post: {
          summary: 'Criar ou atualizar NFE',
          responses: {
            200: { description: 'NFE salva com sucesso' },
          },
        },
      },
      '/nfes/{id}': {
        get: {
          summary: 'Buscar NFE por ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'Dados da NFE' },
            404: { description: 'NFE não encontrada' },
          },
        },
        put: {
          summary: 'Atualizar NFE',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'NFE atualizada' },
          },
        },
        delete: {
          summary: 'Excluir NFE',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: { description: 'NFE removida' },
          },
        },
      },
      '/upload-xml': {
        post: {
          summary: 'Upload de arquivo XML',
          responses: {
            200: { description: 'Arquivo processado' },
          },
        },
      },
      '/status': {
        get: {
          summary: 'Status da API',
          responses: {
            200: { description: 'API funcionando' },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
