// Configurar timeout global para testes
jest.setTimeout(10000);

// Mock do cache Redis para todos os testes
const mockCache = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  del: jest.fn().mockResolvedValue(true),
  invalidatePattern: jest.fn().mockResolvedValue(true),
  generateNfeListKey: jest.fn((params) => `nfes:list:${JSON.stringify(params)}`),
  generateNfeDetailKey: jest.fn((id) => `nfes:detail:${id}`),
  generateStatsKey: jest.fn(() => 'nfes:stats')
};

// Exportar mock para uso nos testes
global.mockCache = mockCache;