import { useState, useEffect } from 'react';
import { useNFEAPI } from './useNFEAPI';

export interface NFE {
  id: string;
  data: string;
  numero: string;
  fornecedor: string;
  valor: number;
  itens: number;
  produtos: any[];
  brandName?: string;
  invoiceNumber?: string;
  isFavorite?: boolean;
  chaveNFE?: string;
  impostoEntrada: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: 'none' | 'up' | 'down' | 'nearest';
  valorFrete?: number;
}

export const useNFEStorage = () => {
  const { nfes: savedNFEs, loading, error, loadNFEs, saveNFE: apiSaveNFE, updateNFE, deleteNFE: apiDeleteNFE } = useNFEAPI();

  const checkDuplicateNFE = (chaveNFE: string | undefined): boolean => {
    if (!chaveNFE) return false;
    return Array.isArray(savedNFEs) ? savedNFEs.some(nfe => nfe.chaveNFE === chaveNFE) : false;
  };

  const saveNFE = async (nfe: NFE) => {
    try {
      console.log('🔄 Iniciando salvamento da NFE:', nfe.id);
      
      // Verificação simplificada: apenas salva a NFE sem verificar duplicação por chaveNFE
      // O servidor já lida com a lógica de insert/update baseado no ID

      // Garantir que produtos seja sempre um array
      const nfeWithProducts = {
        ...nfe,
        produtos: Array.isArray(nfe.produtos) ? nfe.produtos : []
      };

      console.log('📤 Enviando NFE para API:', {
        id: nfeWithProducts.id,
        fornecedor: nfeWithProducts.fornecedor,
        valor: nfeWithProducts.valor,
        itens: nfeWithProducts.itens,
        produtosCount: nfeWithProducts.produtos.length
      });

      // Salva via API - o servidor lida com insert/update automaticamente
      await apiSaveNFE(nfeWithProducts);
      console.log('✅ NFE salva com sucesso:', nfe.id);
    } catch (error) {
      console.error('❌ Erro detalhado ao salvar NFE:', {
        nfeId: nfe.id,
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao salvar nota fiscal');
    }
  };

  const removeNFE = async (id: string) => {
    try {
      await apiDeleteNFE(id);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao remover nota fiscal');
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const nfe = Array.isArray(savedNFEs) ? savedNFEs.find(n => n.id === id) : undefined;
      if (nfe) {
        await updateNFE(id, { isFavorite: !nfe.isFavorite });
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar favorito');
    }
  };

  const updateNFEImpostoEntrada = async (id: string, impostoEntrada: number) => {
    try {
      await updateNFE(id, { impostoEntrada });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar imposto de entrada');
    }
  };

  const updateProdutoCustoExtra = async (nfeId: string, produtoCodigo: string, custoExtra: number) => {
    try {
      const nfe = Array.isArray(savedNFEs) ? savedNFEs.find(n => n.id === nfeId) : undefined;
      if (nfe && nfe.produtos) {
        const updatedProdutos = nfe.produtos.map(produto =>
          produto.codigo === produtoCodigo
            ? { ...produto, custoExtra }
            : produto
        );
        await updateNFE(nfeId, { produtos: updatedProdutos });
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar custo extra do produto');
    }
  };

  const updateProdutoFreteProporcional = async (nfeId: string, produtoCodigo: string, freteProporcional: number) => {
    try {
      const nfe = Array.isArray(savedNFEs) ? savedNFEs.find(n => n.id === nfeId) : undefined;
      if (nfe && nfe.produtos) {
        const updatedProdutos = nfe.produtos.map(produto =>
          produto.codigo === produtoCodigo
            ? { ...produto, freteProporcional }
            : produto
        );
        await updateNFE(nfeId, { produtos: updatedProdutos });
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar frete proporcional do produto');
    }
  };

  return {
    savedNFEs,
    loading,
    error,
    checkDuplicateNFE,
    saveNFE,
    removeNFE,
    toggleFavorite,
    updateNFEImpostoEntrada,
    updateProdutoCustoExtra,
    updateProdutoFreteProporcional,
    loadNFEs,
  };
};