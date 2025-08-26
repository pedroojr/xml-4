import { describe, it, expect } from '@jest/globals';
import { formatCurrency } from '../../frontend/src/utils/formatters';

// Copied logic similar to the parser used in the application
const parseNumber = (text: string): number => {
  if (!text) return 0;
  const cleanText = text.replace(/\./g, '').replace(',', '.');
  const number = parseFloat(cleanText);
  return isNaN(number) ? 0 : number;
};

describe('parseNumber', () => {
  it('deve converter texto em número', () => {
    expect(parseNumber('1.234,56')).toBeCloseTo(1234.56);
  });

  it('deve retornar 0 para texto inválido', () => {
    expect(parseNumber('abc')).toBe(0);
  });

  it('deve retornar 0 para texto vazio', () => {
    expect(parseNumber('')).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('deve formatar número para moeda brasileira', () => {
    expect(formatCurrency(1000.5)).toBe('R$\u00a01.000,50');
  });

  it('deve lidar com valores inválidos', () => {
    expect(formatCurrency(Number('invalid'))).toBe('R$\u00a0NaN');
  });
});
