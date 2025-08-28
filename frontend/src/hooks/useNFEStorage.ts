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
  roundingType?: string;
  valorFrete?: number;
}

export const useNFEStorage = () => {
  const { nfes: savedNFEs, loading, error, loadNFEs, saveNFE: apiSaveNFE, updateNFE, deleteNFE: apiDeleteNFE } = useNFEAPI();

  const checkDuplicateNFE = (chaveNFE: string | undefined): boolean => {
    if (!chaveNFE) return false;
    return savedNFEs.some(nfe => nfe.chaveNFE === chaveNFE);
  };

  const saveNFE = async (nfe: NFE) => {
    try {
      // Verifica se já existe uma nota com a mesma chave
      if (nfe.chaveNFE && checkDuplicateNFE(nfe.chaveNFE)) {
        // Se for uma atualização da mesma nota (mesmo ID), permite
        const existingNFE = savedNFEs.find(saved => saved.id === nfe.id);
        if (!existingNFE) {
          throw new Error('Esta nota fiscal já foi cadastrada anteriormente');
        }
      }

      // Salva via API
      await apiSaveNFE(nfe);
    } catch (error) {
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
      const nfe = savedNFEs.find(n => n.id === id);
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
      const nfe = savedNFEs.find(n => n.id === nfeId);
      if (nfe) {
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
      const nfe = savedNFEs.find(n => n.id === nfeId);
      if (nfe) {
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