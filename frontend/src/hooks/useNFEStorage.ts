import { useState, useEffect } from 'react';
import { useNFEAPI } from './useNFEAPI';
import { logger } from '../utils/logger';

export interface NFE {
  id: string;
  data: string;
  numero: string;
  fornecedor: string;
  valor: number;
  valorTotal?: number; // Valor total da NFE do XML
  itens: number;
  produtos: any[];
  brandName?: string;
  invoiceNumber?: string;
  isFavorite?: boolean;
  chaveNFE?: string;
  impostoEntrada: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: '90' | '50' | 'none';
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
      
      // Garantir que produtos seja sempre um array e mantenha todos os campos
      const nfeWithProducts = {
        ...nfe,
        produtos: Array.isArray(nfe.produtos) ? nfe.produtos.map(produto => ({
          ...produto,
          codigo: produto.codigo || '',
          unidade: produto.unidade || '',
          discount: produto.discount || 0
        })) : []
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
      logger.error('❌ Erro detalhado ao salvar NFE:', {
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
      console.log('🗑️ Removendo NFE:', id);
      await apiDeleteNFE(id);
      console.log('✅ NFE removida com sucesso:', id);
    } catch (error) {
      logger.error('❌ Erro detalhado ao remover NFE:', {
         nfeId: id,
         error: error,
         errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
         errorStack: error instanceof Error ? error.stack : undefined
       });
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Erro ao remover nota fiscal ${id}`);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      console.log('⭐ Alternando favorito para NFE:', id);
      const nfe = Array.isArray(savedNFEs) ? savedNFEs.find(n => n.id === id) : undefined;
      if (!nfe) {
        throw new Error(`NFE com ID ${id} não encontrada`);
      }
      await updateNFE(id, { isFavorite: !nfe.isFavorite });
      console.log('✅ Favorito atualizado com sucesso:', { id, isFavorite: !nfe.isFavorite });
    } catch (error) {
      logger.error('❌ Erro detalhado ao atualizar favorito:', {
         nfeId: id,
         error: error,
         errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
         errorStack: error instanceof Error ? error.stack : undefined
       });
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Erro ao atualizar favorito da NFE ${id}`);
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