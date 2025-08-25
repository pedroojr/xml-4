import { formatNumberForCopy } from './formatters';

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) {
    console.error('Tentativa de copiar texto vazio ou nulo');
    return false;
  }

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback para navegadores que não suportam a API Clipboard
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (err) {
        console.error('Fallback: Erro ao copiar texto', err);
        textArea.remove();
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Erro ao copiar para a área de transferência:', err);
    return false;
  }
};

export const copyNumberToClipboard = async (value: number, decimalPlaces: number = 2): Promise<boolean> => {
  if (typeof value !== 'number' || isNaN(value)) {
    console.error('Valor inválido para cópia:', value);
    return false;
  }

  try {
    const formattedValue = formatNumberForCopy(value, decimalPlaces);
    return await copyToClipboard(formattedValue);
  } catch (err) {
    console.error('Erro ao formatar e copiar número:', err);
    return false;
  }
}; 