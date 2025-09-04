
interface SizePattern {
  pattern: RegExp;
  sizes: string[];
  description: string;
}

const sizePatterns: SizePattern[] = [
  {
    pattern: /\b(PP|P|M|G|GG|XG|XXG)\b/i,
    sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    description: 'Standard clothing sizes'
  },
  {
    pattern: /\b(\d{2}\/\d{2})\b/,
    sizes: [], // Dynamic, e.g., "34/35"
    description: 'Shoe sizes with range'
  },
  {
    pattern: /\bTAM(?:ANHO)?[\s:.]-?\s*([A-Za-z0-9]{1,3})\b/i,
    sizes: [], // Dynamic, e.g., "TAM: G" or "TAMANHO M"
    description: 'Explicit size indicator'
  },
  {
    pattern: /\b(INFANTIL|ADULTO|JUVENIL)\b/i,
    sizes: ['INFANTIL', 'ADULTO', 'JUVENIL'],
    description: 'Size categories'
  },
  {
    pattern: /-(\d{1,2})(?:\s|$)/,
    sizes: [], // Dynamic, numbers at the end of the reference
    description: 'Numbers at the end of the reference (Kelly style)'
  },
  {
    pattern: /(?:FEMININA|MASCULINA|INFANTIL)-(\d{1,2})-/i,
    sizes: [], // Dynamic, Elian pattern: IG FEMININA-12-2037
    description: 'Elian pattern (number between hyphens)'
  }
];

const normalizeSize = (size: string): string => {
  const normalized = size.trim().toUpperCase();

  // Standardize specific nomenclatures
  const standardizations: { [key: string]: string } = {
    'PEQUENO': 'P',
    'MEDIO': 'M',
    'MÉDIO': 'M',
    'GRANDE': 'G',
    'EXTRA GRANDE': 'XG',
    'EXTRA PEQUENO': 'PP'
  };

  return standardizations[normalized] || normalized;
};

const validateSize = (size: string): boolean => {
  const validSizes = new Set([
    'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG',
    'INFANTIL', 'ADULTO', 'JUVENIL'
  ]);

  const numericPattern = /^\d{1,2}$/;  // 1 or 2 digits
  const rangePattern = /^\d{2}\/\d{2}$/;  // format 00/00

  const normalizedSize = normalizeSize(size);

  return validSizes.has(normalizedSize) ||
         numericPattern.test(normalizedSize) ||
         rangePattern.test(normalizedSize);
};

export const extractSizeFromReference = (reference: string): string => {
  if (!reference) return '';

  // Search for a number at the end of the reference (Kelly style)
  const match = reference.match(/-(\d{1,2})(?:\s|$)/);
  if (match && match[1]) {
    const size = match[1];
    if (validateSize(size)) {
      return size;
    }
  }

  return '';
};

export const extractSizeFromDescription = (description: string): string => {
  if (!description) return '';

  const normalizedText = description.toUpperCase();

  // Elian pattern: extract number between hyphens after FEMININA/MASCULINA/INFANTIL
  const elianMatch = normalizedText.match(/(?:FEMININA|MASCULINA|INFANTIL)-(\d{1,2})-/i);
  if (elianMatch && elianMatch[1]) {
    const size = elianMatch[1];
    if (validateSize(size)) {
      return size;
    }
  }

  // Special cases for children's products
  if (normalizedText.includes('INFAN') && normalizedText.includes('COMUM')) {
    return 'INFANTIL';
  }

  // Other size patterns
  for (const { pattern } of sizePatterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      const foundSize = normalizeSize(match[1]);
      if (validateSize(foundSize)) {
        return foundSize;
      }
    }
  }

  return '';
};

// Function for debugging and pattern analysis
export const analyzeDetailedPatterns = (description: string): {
  foundSize: string;
  usedPattern?: string;
  details: string[];
} => {
  const details: string[] = [];

  if (!description) {
    return {
      foundSize: '',
      details: ['Empty description']
    };
  }

  const normalizedText = description.toUpperCase();
  details.push(`Normalized text: ${normalizedText}`);

  for (const { pattern, description } of sizePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      details.push(`Pattern found: ${description}`);
      details.push(`Full match: ${match[0]}`);

      if (match[1]) {
        const normalizedSize = normalizeSize(match[1]);
        details.push(`Normalized size: ${normalizedSize}`);

        if (validateSize(normalizedSize)) {
          return {
            foundSize: normalizedSize,
            usedPattern: description,
            details
          };
        } else {
          details.push(`Size "${normalizedSize}" failed validation`);
        }
      }
    }
  }

  return {
    foundSize: '',
    details: [...details, 'No valid size found']
  };
};
