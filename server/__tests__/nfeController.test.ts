import { describe, it, expect } from '@jest/globals';

// Funções simuladas de cálculo de totais e descontos
const calculateTotals = (
  items: Array<{ quantidade: number; valor: number }>
): number => {
  if (!Array.isArray(items)) throw new Error('Itens inválidos');
  return items.reduce((sum, item) => {
    if (typeof item.quantidade !== 'number' || typeof item.valor !== 'number') {
      throw new Error('Campos obrigatórios ausentes');
    }
    return sum + item.quantidade * item.valor;
  }, 0);
};

const calculateDiscount = (total: number, discount: number): number => {
  if (typeof total !== 'number' || typeof discount !== 'number') {
    throw new Error('Valores inválidos');
  }
  if (discount < 0 || discount > total) {
    throw new Error('Desconto inválido');
  }
  return total - discount;
};

describe('Funções de cálculo de NFE', () => {
  it('deve calcular total e aplicar desconto', () => {
    const itens = [
      { quantidade: 2, valor: 10 },
      { quantidade: 1, valor: 20 },
    ];
    const total = calculateTotals(itens);
    expect(total).toBe(40);
    const liquido = calculateDiscount(total, 5);
    expect(liquido).toBe(35);
  });

  it('deve falhar quando itens são inválidos', () => {
    expect(() => calculateTotals(null as any)).toThrow('Itens inválidos');
    expect(() =>
      calculateTotals([{ quantidade: 1, valor: undefined as any }])
    ).toThrow('Campos obrigatórios ausentes');
  });

  it('deve falhar quando desconto é inválido', () => {
    expect(() => calculateDiscount(100, -1)).toThrow('Desconto inválido');
    expect(() => calculateDiscount(100, 150)).toThrow('Desconto inválido');
  });
});
