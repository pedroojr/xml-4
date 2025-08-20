
interface SizePattern {
  pattern: RegExp;
  sizes: string[];
  description: string;
}

const sizePatterns: SizePattern[] = [
  {
    pattern: /\b(PP|P|M|G|GG|XG|XXG)\b/i,
    sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    description: 'Tamanhos padrão de vestuário'
  },
  {
    pattern: /\b(\d{2}\/\d{2})\b/,
    sizes: [], // Dinâmico, ex: "34/35"
    description: 'Tamanhos de calçados com faixa'
  },
  {
    pattern: /\bTAM(?:ANHO)?[\s:.]-?\s*([A-Za-z0-9]{1,3})\b/i,
    sizes: [], // Dinâmico, ex: "TAM: G" ou "TAMANHO M"
    description: 'Indicador explícito de tamanho'
  },
  {
    pattern: /\b(INFANTIL|ADULTO|JUVENIL)\b/i,
    sizes: ['INFANTIL', 'ADULTO', 'JUVENIL'],
    description: 'Categorias de tamanho'
  },
  {
    pattern: /-(\d{1,2})(?:\s|$)/,
    sizes: [], // Dinâmico, números no final da referência
    description: 'Números no final da referência (estilo Kelly)'
  },
  {
    pattern: /(?:FEMININA|MASCULINA|INFANTIL)-(\d{1,2})-/i,
    sizes: [], // Dinâmico, padrão Elian: IG FEMININA-12-2037
    description: 'Padrão Elian (número entre hífens)'
  }
];

const normalizarTamanho = (tamanho: string): string => {
  const normalizado = tamanho.trim().toUpperCase();
  
  // Padroniza nomenclaturas específicas
  const padronizacoes: { [key: string]: string } = {
    'PEQUENO': 'P',
    'MEDIO': 'M',
    'MÉDIO': 'M',
    'GRANDE': 'G',
    'EXTRA GRANDE': 'XG',
    'EXTRA PEQUENO': 'PP'
  };

  return padronizacoes[normalizado] || normalizado;
};

const validarTamanho = (tamanho: string): boolean => {
  const tamanhosValidos = new Set([
    'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG',
    'INFANTIL', 'ADULTO', 'JUVENIL'
  ]);

  const padraoNumerico = /^\d{1,2}$/;  // 1 ou 2 dígitos
  const padraoFaixa = /^\d{2}\/\d{2}$/;  // formato 00/00

  const tamanhoNormalizado = normalizarTamanho(tamanho);

  return tamanhosValidos.has(tamanhoNormalizado) ||
         padraoNumerico.test(tamanhoNormalizado) ||
         padraoFaixa.test(tamanhoNormalizado);
};

export const extrairTamanhoDaReferencia = (referencia: string): string => {
  if (!referencia) return '';

  // Procura por número no final da referência (estilo Kelly)
  const match = referencia.match(/-(\d{1,2})(?:\s|$)/);
  if (match && match[1]) {
    const tamanho = match[1];
    if (validarTamanho(tamanho)) {
      return tamanho;
    }
  }

  return '';
};

export const extrairTamanhoDaDescricao = (descricao: string): string => {
  if (!descricao) return '';

  const textoNormalizado = descricao.toUpperCase();
  
  // Padrão Elian: extrai número entre hífens após FEMININA/MASCULINA/INFANTIL
  const matchElian = textoNormalizado.match(/(?:FEMININA|MASCULINA|INFANTIL)-(\d{1,2})-/i);
  if (matchElian && matchElian[1]) {
    const tamanho = matchElian[1];
    if (validarTamanho(tamanho)) {
      return tamanho;
    }
  }

  // Casos especiais para produtos infantis
  if (textoNormalizado.includes('INFAN') && textoNormalizado.includes('COMUM')) {
    return 'INFANTIL';
  }

  // Outros padrões de tamanho
  for (const { pattern } of sizePatterns) {
    const match = textoNormalizado.match(pattern);
    if (match && match[1]) {
      const tamanhoEncontrado = normalizarTamanho(match[1]);
      if (validarTamanho(tamanhoEncontrado)) {
        return tamanhoEncontrado;
      }
    }
  }

  return '';
};

// Função para debug e análise de padrões
export const analisarPadroesDetalhados = (descricao: string): { 
  tamanhoEncontrado: string;
  padraoUtilizado?: string;
  detalhes: string[];
} => {
  const detalhes: string[] = [];
  
  if (!descricao) {
    return { 
      tamanhoEncontrado: '', 
      detalhes: ['Descrição vazia']
    };
  }

  const textoNormalizado = descricao.toUpperCase();
  detalhes.push(`Texto normalizado: ${textoNormalizado}`);

  for (const { pattern, description } of sizePatterns) {
    const match = textoNormalizado.match(pattern);
    if (match) {
      detalhes.push(`Padrão encontrado: ${description}`);
      detalhes.push(`Match completo: ${match[0]}`);
      
      if (match[1]) {
        const tamanhoNormalizado = normalizarTamanho(match[1]);
        detalhes.push(`Tamanho normalizado: ${tamanhoNormalizado}`);
        
        if (validarTamanho(tamanhoNormalizado)) {
          return {
            tamanhoEncontrado: tamanhoNormalizado,
            padraoUtilizado: description,
            detalhes
          };
        } else {
          detalhes.push(`Tamanho "${tamanhoNormalizado}" não passou na validação`);
        }
      }
    }
  }

  return {
    tamanhoEncontrado: '',
    detalhes: [...detalhes, 'Nenhum tamanho válido encontrado']
  };
};
