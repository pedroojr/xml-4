
import { Product } from '../../types/nfe';

const formatProductDescription = (description: string): string => {
  // Remove specific codes at the end of the description (e.g., SCY765/02)
  const nameWithoutCode = description.replace(/\s+\w+\/\d+$/, '');

  // Capitalize each word
  return nameWithoutCode
    .split(' ')
    .map(word => {
      // Do not capitalize small words like "de", "da", "do", etc.
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
  
  // Formatted product name
  const formattedDescription = formatProductDescription(product.description);
  parts.push(formattedDescription);

  // Technical data in a separate section
  const technicalInfo: string[] = [];

  // Add reference if available (without the REF prefix)
  if (product.reference) {
    technicalInfo.push(product.reference);
  }

  // Add product code if available and different from the reference
  if (product.code && product.code !== product.reference) {
    technicalInfo.push(product.code);
  }

  // Add EAN if available (without the EAN prefix)
  if (product.ean) {
    technicalInfo.push(product.ean);
  }

  // Color and size information
  const attributes: string[] = [];
  
  if (product.color) {
    attributes.push(`COR: ${product.color.toUpperCase()}`);
  }
  
  if (product.size) {
    attributes.push(`TAM: ${product.size}`);
  }

  // Build the final description
  if (attributes.length > 0) {
    parts.push(attributes.join(' '));
  }

  if (technicalInfo.length > 0) {
    parts.push(technicalInfo.join(' '));
  }

  // Join all parts using a single space as separator
  return parts.join(' ');
};
