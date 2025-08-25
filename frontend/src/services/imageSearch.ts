
import { toast } from "sonner";

export interface ImageSearchParams {
  ean: string;
  code: string;
  description: string;
}

export const searchProductImage = async ({ ean, code, description }: ImageSearchParams): Promise<string> => {
  try {
    const searchTerms = `${ean} ${code} ${description}`.trim();
    console.log('Termos de busca:', searchTerms);
    
    return `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}&tbm=isch`;
  } catch (error) {
    console.error('Erro ao gerar URL de busca:', error);
    toast.error('Erro ao preparar busca de imagens');
    throw error;
  }
};

export const downloadImage = async (imageUrl: string, fileName: string): Promise<void> => {
  try {
    console.log('Iniciando download da imagem:', imageUrl);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Falha ao baixar imagem: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('Blob criado:', blob.type, blob.size);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Limpa o nome do arquivo e adiciona a extensão correta
    const sanitizedFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    link.download = `${sanitizedFileName}.${extension}`;
    
    console.log('Iniciando download com nome:', link.download);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Imagem baixada com sucesso!');
  } catch (error) {
    console.error('Erro ao fazer download da imagem:', error);
    toast.error('Erro ao fazer download da imagem. Verifique se a URL é válida.');
  }
};
