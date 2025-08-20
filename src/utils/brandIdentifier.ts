
export type BrandInfo = {
  brand: string;
  confidence: number;
};

type ReferencePattern = {
  pattern: RegExp;
  brand: string | ((match: string) => string);
  confidence: number;
  extract: (match: RegExpMatchArray) => string;
};

export const extractReferencePattern = (text: string): BrandInfo | null => {
  // Padrões comuns de referência
  const patterns: ReferencePattern[] = [
    // Malharia Cristina: 1000557-300009-10 (pegamos apenas 1000557)
    {
      pattern: /(\d{7})-\d{6}-\d{2}/,
      brand: 'CRISTINA',
      confidence: 0.9,
      extract: (match: RegExpMatchArray) => match[1]
    },
    // Apenas números com 7 dígitos (possível Cristina sem formatação)
    {
      pattern: /^(\d{7})$/,
      brand: 'CRISTINA',
      confidence: 0.7,
      extract: (match: RegExpMatchArray) => match[1]
    },
    // Letra seguida de números (ex: K12345, M1234)
    {
      pattern: /([A-Z][0-9]{4,5})/i,
      brand: (match: string) => `REF-${match.toUpperCase()}`,
      confidence: 0.8,
      extract: (match: RegExpMatchArray) => match[1]
    },
    // Duas letras seguidas de números (ex: BR123, EL123)
    {
      pattern: /([A-Z]{2}[0-9]{3,4})/i,
      brand: (match: string) => `REF-${match.substring(0, 2).toUpperCase()}`,
      confidence: 0.8,
      extract: (match: RegExpMatchArray) => match[1]
    }
  ];

  for (const def of patterns) {
    const match = text.match(def.pattern);
    if (match) {
      const reference = def.extract(match);
      const brand = typeof def.brand === 'function' ? def.brand(reference) : def.brand;
      return {
        brand,
        confidence: def.confidence
      };
    }
  }

  return null;
};

export const identifyBrand = (reference: string, name: string): BrandInfo => {
  // Tenta encontrar um padrão de referência tanto no código quanto no nome
  const refMatch = extractReferencePattern(reference) || extractReferencePattern(name);
  
  if (refMatch) {
    return refMatch;
  }

  // Se não encontrou nenhum padrão conhecido
  return {
    brand: 'OUTROS',
    confidence: 0.3
  };
};

// Função auxiliar para ajudar no debug
export const analyzeReference = (reference: string, name: string) => {
  console.log('Analisando referência:', {
    reference,
    name,
    result: identifyBrand(reference, name)
  });
};
