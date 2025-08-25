import axios from 'axios';

interface XMLProcessingResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: Array<{
    file: string;
    error: string;
  }>;
}

interface NFEInfo {
  numero: string;
  chaveAcesso: string;
  dataEmissao: string;
  dataEntrada: string;
  valorTotal: string;
  valorICMS: string;
  valorIPI: string;
  valorPIS: string;
  valorCOFINS: string;
  emitente: {
    nome: string;
    cnpj: string;
    ie: string;
  };
  destinatario: {
    nome: string;
    cnpj: string;
    ie: string;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    descricao_complementar: string;
    quantidade: string;
    valorUnitario: string;
    valorTotal: string;
    ncm: string;
    fornecedor: string;
  }>;
}

// Cache para armazenar arquivos já processados
const processedFilesCache = new Map<string, NFEInfo>();

export const xmlService = {
  async processXMLFiles(files: File[]): Promise<XMLProcessingResult> {
    const errors: Array<{ file: string; error: string }> = [];
    const processedData: NFEInfo[] = [];

    for (const file of files) {
      try {
        // Verificar se o arquivo já foi processado
        const cacheKey = `${file.name}-${file.size}`;
        if (processedFilesCache.has(cacheKey)) {
          processedData.push(processedFilesCache.get(cacheKey)!);
          continue;
        }

        // Validar XML
        const isValid = await this.validateXML(file);
        if (!isValid) {
          errors.push({ file: file.name, error: 'Arquivo XML inválido' });
          continue;
        }

        // Extrair informações
        const nfeInfo = await this.extractNFEInfo(file);
        if (!nfeInfo) {
          errors.push({ file: file.name, error: 'Não foi possível extrair informações da NFE' });
          continue;
        }

        // Armazenar no cache
        processedFilesCache.set(cacheKey, nfeInfo);
        processedData.push(nfeInfo);

      } catch (error) {
        console.error(`Erro ao processar arquivo ${file.name}:`, error);
        errors.push({ 
          file: file.name, 
          error: error instanceof Error ? error.message : 'Erro desconhecido ao processar arquivo' 
        });
      }
    }

    return {
      success: errors.length === 0,
      message: errors.length > 0 
        ? `Processamento concluído com ${errors.length} erro(s)` 
        : 'Todos os arquivos foram processados com sucesso',
      data: processedData,
      errors: errors.length > 0 ? errors : undefined
    };
  },

  async validateXML(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      
      // Verificar se o arquivo está vazio
      if (!text.trim()) {
        throw new Error('Arquivo vazio');
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Verificar erros de parsing
      const parserErrors = xmlDoc.getElementsByTagName('parsererror');
      if (parserErrors.length > 0) {
        throw new Error('Erro de sintaxe XML');
      }

      // Verificar se é uma NFE
      const nfe = xmlDoc.getElementsByTagName('NFe');
      if (!nfe || nfe.length === 0) {
        throw new Error('Arquivo não é uma NFE válida');
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar XML:', error);
      return false;
    }
  },

  async extractNFEInfo(file: File): Promise<NFEInfo | null> {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      const nfe = xmlDoc.getElementsByTagName('NFe')[0];
      if (!nfe) {
        throw new Error('Nó NFe não encontrado');
      }

      // Extrair informações básicas
      const ide = nfe.getElementsByTagName('ide')[0];
      const emit = nfe.getElementsByTagName('emit')[0];
      const dest = nfe.getElementsByTagName('dest')[0];
      const total = nfe.getElementsByTagName('total')[0];
      const det = nfe.getElementsByTagName('det');

      if (!ide || !emit || !dest || !total || !det) {
        throw new Error('Estrutura da NFE incompleta');
      }

      // Extrair itens
      const itens = Array.from(det).map(item => {
        const prod = item.getElementsByTagName('prod')[0];
        // Buscar infAdProd diretamente do item (det)
        const infAdProd = item.getElementsByTagName('infAdProd')[0];
        
        if (!prod) {
          throw new Error('Produto sem informações básicas');
        }

        // Log detalhado para debug
        const itemData = {
          codigo: prod.getElementsByTagName('cProd')[0]?.textContent,
          descricao: prod.getElementsByTagName('xProd')[0]?.textContent,
          infAdProd: infAdProd?.textContent,
          fornecedor: emit.getElementsByTagName('xNome')[0]?.textContent,
          EAN: prod.getElementsByTagName('cEAN')[0]?.textContent
        };
        
        console.log('Processando item:', itemData);
        console.log('infAdProd encontrado:', infAdProd ? 'Sim' : 'Não');
        if (infAdProd) {
          console.log('Conteúdo do infAdProd:', infAdProd.textContent);
        }

        return {
          codigo: prod.getElementsByTagName('cProd')[0]?.textContent || '',
          descricao: prod.getElementsByTagName('xProd')[0]?.textContent || '',
          descricao_complementar: infAdProd?.textContent?.trim() || '',
          quantidade: prod.getElementsByTagName('qCom')[0]?.textContent || '',
          valorUnitario: prod.getElementsByTagName('vUnCom')[0]?.textContent || '',
          valorTotal: prod.getElementsByTagName('vProd')[0]?.textContent || '',
          ncm: prod.getElementsByTagName('NCM')[0]?.textContent || '',
          fornecedor: emit.getElementsByTagName('xNome')[0]?.textContent || '',
        };
      });

      // Extrair totais
      const icmsTot = total.getElementsByTagName('ICMSTot')[0];
      if (!icmsTot) {
        throw new Error('Totais da NFE não encontrados');
      }

      return {
        numero: ide.getElementsByTagName('nNF')[0]?.textContent || '',
        chaveAcesso: ide.getElementsByTagName('chNFe')[0]?.textContent || '',
        dataEmissao: ide.getElementsByTagName('dhEmi')[0]?.textContent || '',
        dataEntrada: ide.getElementsByTagName('dhSaiEnt')[0]?.textContent || '',
        valorTotal: icmsTot.getElementsByTagName('vNF')[0]?.textContent || '',
        valorICMS: icmsTot.getElementsByTagName('vICMS')[0]?.textContent || '',
        valorIPI: icmsTot.getElementsByTagName('vIPI')[0]?.textContent || '',
        valorPIS: icmsTot.getElementsByTagName('vPIS')[0]?.textContent || '',
        valorCOFINS: icmsTot.getElementsByTagName('vCOFINS')[0]?.textContent || '',
        emitente: {
          nome: emit.getElementsByTagName('xNome')[0]?.textContent || '',
          cnpj: emit.getElementsByTagName('CNPJ')[0]?.textContent || '',
          ie: emit.getElementsByTagName('IE')[0]?.textContent || '',
        },
        destinatario: {
          nome: dest.getElementsByTagName('xNome')[0]?.textContent || '',
          cnpj: dest.getElementsByTagName('CNPJ')[0]?.textContent || '',
          ie: dest.getElementsByTagName('IE')[0]?.textContent || '',
        },
        itens,
      };
    } catch (error) {
      console.error('Erro ao extrair informações da NFE:', error);
      return null;
    }
  },

  // Método para limpar o cache
  clearCache(): void {
    processedFilesCache.clear();
  }
}; 