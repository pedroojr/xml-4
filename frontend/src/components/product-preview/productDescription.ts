
import { Product } from '../../types/nfe';

const formatProductName = (name: string): string => {
  // Remove códigos específicos no final do nome (como SCY765/02)
  const nameWithoutCode = name.replace(/\s+\w+\/\d+$/, '');
  
  // Capitaliza cada palavra
  return nameWithoutCode
    .split(' ')
    .map(word => {
      // Não capitaliza palavras pequenas como "de", "da", "do", etc.
      const smallWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'em', 'para'];
      if (smallWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const generateProductDescription = (product: Product): string => {
  const parts: string[] = [];
  
  // Nome do produto formatado
  const formattedName = formatProductName(product.name);
  parts.push(formattedName);

  // Dados técnicos em uma seção separada
  const technicalInfo: string[] = [];

  // Adiciona referência se disponível (sem o prefixo REF)
  if (product.reference) {
    technicalInfo.push(product.reference);
  }

  // Adiciona código do produto se disponível e diferente da referência
  if (product.code && product.code !== product.reference) {
    technicalInfo.push(product.code);
  }

  // Adiciona EAN se disponível (sem o prefixo EAN)
  if (product.ean) {
    technicalInfo.push(product.ean);
  }

  // Informações de cor e tamanho
  const attributes: string[] = [];
  
  if (product.color) {
    attributes.push(`COR: ${product.color.toUpperCase()}`);
  }
  
  if (product.size) {
    attributes.push(`TAM: ${product.size}`);
  }

  // Monta a descrição final
  if (attributes.length > 0) {
    parts.push(attributes.join(' '));
  }

  if (technicalInfo.length > 0) {
    parts.push(technicalInfo.join(' '));
  }

  // Une todas as partes usando apenas espaço como separador
  return parts.join(' ');
};
