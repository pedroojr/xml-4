
const CORES_COMUNS = [
  'PRETO', 'BRANCO', 'VERMELHO', 'AZUL', 'VERDE', 'AMARELO', 'MARROM',
  'CINZA', 'ROXO', 'ROSA', 'LARANJA', 'BEGE', 'DOURADO', 'PRATA'
] as const;

export type CorComum = typeof CORES_COMUNS[number];

export const extractColorFromDescription = (description: string): string | null => {
  const upper = description.toUpperCase();
  return CORES_COMUNS.find(cor => upper.includes(cor)) || null;
};

export const CORES_OPCOES = CORES_COMUNS.map(cor => ({
  label: cor.charAt(0) + cor.slice(1).toLowerCase(),
  value: cor
}));
