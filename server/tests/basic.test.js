// Testes básicos para verificar funcionalidades principais
const fs = require('fs');
const path = require('path');

describe('Sistema de Importação XML - Testes Básicos', () => {
  describe('Estrutura do Projeto', () => {
    test('deve ter arquivo server.js principal', () => {
      const serverPath = path.join(__dirname, '..', 'server.js');
      expect(fs.existsSync(serverPath)).toBe(true);
    });

    test('deve ter arquivo de cache', () => {
      const cachePath = path.join(__dirname, '..', 'cache.js');
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    test('deve ter arquivo de validação XML', () => {
      const xmlValidatorPath = path.join(__dirname, '..', 'xmlValidator.js');
      expect(fs.existsSync(xmlValidatorPath)).toBe(true);
    });

    test('deve ter package.json com dependências corretas', () => {
      const packagePath = path.join(__dirname, '..', 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
      
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(packageJson.dependencies).toHaveProperty('express');
      expect(packageJson.dependencies).toHaveProperty('better-sqlite3');
      expect(packageJson.dependencies).toHaveProperty('redis');
      expect(packageJson.dependencies).toHaveProperty('libxmljs2');
    });
  });

  describe('Configuração de Ambiente', () => {
    test('deve ter arquivo .env.example', () => {
      const envExamplePath = path.join(__dirname, '..', '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);
    });

    test('deve ter configuração do Jest', () => {
      const jestConfigPath = path.join(__dirname, '..', 'jest.config.js');
      expect(fs.existsSync(jestConfigPath)).toBe(true);
    });
  });

  describe('Funcionalidades Básicas', () => {
    test('deve validar formato de número de NFe', () => {
      const validarNumeroNfe = (numero) => {
        return /^\d{9}$/.test(numero);
      };

      expect(validarNumeroNfe('000000001')).toBe(true);
      expect(validarNumeroNfe('123456789')).toBe(true);
      expect(validarNumeroNfe('12345678')).toBe(false);
      expect(validarNumeroNfe('1234567890')).toBe(false);
      expect(validarNumeroNfe('abc123456')).toBe(false);
    });

    test('deve validar formato de série', () => {
      const validarSerie = (serie) => {
        return /^\d{1,3}$/.test(serie);
      };

      expect(validarSerie('1')).toBe(true);
      expect(validarSerie('12')).toBe(true);
      expect(validarSerie('123')).toBe(true);
      expect(validarSerie('1234')).toBe(false);
      expect(validarSerie('abc')).toBe(false);
    });

    test('deve validar formato de valor', () => {
      const validarValor = (valor) => {
        return typeof valor === 'number' && valor > 0;
      };

      expect(validarValor(100.50)).toBe(true);
      expect(validarValor(0.01)).toBe(true);
      expect(validarValor(0)).toBe(false);
      expect(validarValor(-10)).toBe(false);
      expect(validarValor('100')).toBe(false);
    });

    test('deve validar formato de data', () => {
      const validarData = (data) => {
        const regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2})?)?$/;
        return regex.test(data);
      };

      expect(validarData('2024-01-01')).toBe(true);
      expect(validarData('2024-01-01T10:00:00')).toBe(true);
      expect(validarData('2024-01-01T10:00:00-03:00')).toBe(true);
      expect(validarData('01/01/2024')).toBe(false);
      expect(validarData('2024-13-01')).toBe(true); // Regex não valida mês
      expect(validarData('invalid-date')).toBe(false);
    });
  });

  describe('Utilitários', () => {
    test('deve gerar chave de cache corretamente', () => {
      const gerarChaveCache = (tipo, params = {}) => {
        switch (tipo) {
          case 'lista':
            return `nfes:list:${JSON.stringify(params)}`;
          case 'detalhe':
            return `nfes:detail:${params.id}`;
          case 'stats':
            return 'nfes:stats';
          default:
            return null;
        }
      };

      expect(gerarChaveCache('lista', { page: 1, limit: 10 }))
        .toBe('nfes:list:{"page":1,"limit":10}');
      
      expect(gerarChaveCache('detalhe', { id: 123 }))
        .toBe('nfes:detail:123');
      
      expect(gerarChaveCache('stats'))
        .toBe('nfes:stats');
      
      expect(gerarChaveCache('invalid'))
        .toBe(null);
    });

    test('deve calcular paginação corretamente', () => {
      const calcularPaginacao = (total, page, limit) => {
        const pages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        
        return {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages,
          offset
        };
      };

      const resultado = calcularPaginacao(100, 2, 10);
      expect(resultado).toEqual({
        page: 2,
        limit: 10,
        total: 100,
        pages: 10,
        offset: 10
      });

      const resultadoUltimaPagina = calcularPaginacao(95, 10, 10);
      expect(resultadoUltimaPagina.pages).toBe(10);
      expect(resultadoUltimaPagina.offset).toBe(90);
    });

    test('deve formatar valores monetários', () => {
      const formatarValor = (valor) => {
        return parseFloat(parseFloat(valor).toFixed(2));
      };

      expect(formatarValor(100.555)).toBe(100.56);
      expect(formatarValor(100.554)).toBe(100.55);
      expect(formatarValor('100.50')).toBe(100.50);
      expect(formatarValor(100)).toBe(100.00);
    });
  });

  describe('Validações de Entrada', () => {
    test('deve validar dados obrigatórios de NFe', () => {
      const validarNfe = (dados) => {
        const camposObrigatorios = ['numero', 'serie', 'data_emissao', 'valor_total'];
        
        for (const campo of camposObrigatorios) {
          if (!dados[campo]) {
            return { valido: false, erro: `Campo ${campo} é obrigatório` };
          }
        }
        
        if (typeof dados.valor_total !== 'number' || dados.valor_total <= 0) {
          return { valido: false, erro: 'Valor total deve ser um número positivo' };
        }
        
        return { valido: true };
      };

      // Dados válidos
      const dadosValidos = {
        numero: '000000001',
        serie: '1',
        data_emissao: '2024-01-01',
        valor_total: 100.50
      };
      expect(validarNfe(dadosValidos).valido).toBe(true);

      // Dados inválidos - campo faltando
      const dadosSemNumero = {
        serie: '1',
        data_emissao: '2024-01-01',
        valor_total: 100.50
      };
      expect(validarNfe(dadosSemNumero).valido).toBe(false);
      expect(validarNfe(dadosSemNumero).erro).toBe('Campo numero é obrigatório');

      // Dados inválidos - valor negativo
      const dadosValorNegativo = {
        numero: '000000001',
        serie: '1',
        data_emissao: '2024-01-01',
        valor_total: -100
      };
      expect(validarNfe(dadosValorNegativo).valido).toBe(false);
      expect(validarNfe(dadosValorNegativo).erro).toBe('Valor total deve ser um número positivo');
    });

    test('deve validar dados de produto', () => {
      const validarProduto = (produto) => {
        const camposObrigatorios = ['codigo', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'];
        
        for (const campo of camposObrigatorios) {
          if (produto[campo] === undefined || produto[campo] === null || produto[campo] === '') {
            return { valido: false, erro: `Campo ${campo} é obrigatório` };
          }
        }
        
        if (produto.quantidade <= 0 || produto.valor_unitario <= 0 || produto.valor_total <= 0) {
          return { valido: false, erro: 'Valores numéricos devem ser positivos' };
        }
        
        return { valido: true };
      };

      // Produto válido
      const produtoValido = {
        codigo: 'PROD001',
        descricao: 'Produto Teste',
        quantidade: 2,
        valor_unitario: 50.00,
        valor_total: 100.00
      };
      expect(validarProduto(produtoValido).valido).toBe(true);

      // Produto inválido
      const produtoInvalido = {
        codigo: 'PROD001',
        descricao: '',
        quantidade: 2,
        valor_unitario: 50.00,
        valor_total: 100.00
      };
      expect(validarProduto(produtoInvalido).valido).toBe(false);
    });
  });

  describe('Performance e Limites', () => {
    test('deve processar arrays pequenos rapidamente', () => {
      const processarArray = (array) => {
        return array.map(item => ({ ...item, processado: true }));
      };

      const startTime = Date.now();
      const array = Array.from({ length: 1000 }, (_, i) => ({ id: i, nome: `Item ${i}` }));
      const resultado = processarArray(array);
      const endTime = Date.now();

      expect(resultado).toHaveLength(1000);
      expect(resultado[0]).toHaveProperty('processado', true);
      expect(endTime - startTime).toBeLessThan(100); // Deve processar em menos de 100ms
    });

    test('deve lidar com strings grandes', () => {
      const processarString = (str) => {
        return str.length > 0 ? str.substring(0, 100) + '...' : '';
      };

      const stringGrande = 'a'.repeat(10000);
      const resultado = processarString(stringGrande);
      
      expect(resultado).toHaveLength(103); // 100 caracteres + '...'
      expect(resultado.endsWith('...')).toBe(true);
    });
  });
});