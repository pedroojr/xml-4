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
  hiddenItems?: string[];
  showHidden?: boolean;
}

export const useNFEStorage = () => {
  const { nfes: savedNFEs, loading, error, loadNFEs, saveNFE: apiSaveNFE, updateNFE, deleteNFE: apiDeleteNFE, loadNFEById } = useNFEAPI();

  // Sincronização em tempo real entre abas (via storage) e mesma aba (CustomEvent)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'nfes_updated' || e.key === 'nfe_updated') {
        loadNFEs();
      }
    };
    const onCustom = () => loadNFEs();
    window.addEventListener('storage', onStorage);
    window.addEventListener('nfes_updated', onCustom as EventListener);
    window.addEventListener('nfe_updated', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('nfes_updated', onCustom as EventListener);
      window.removeEventListener('nfe_updated', onCustom as EventListener);
    };
  }, [loadNFEs]);

  const notify = (type: 'nfes_updated' | 'nfe_updated') => {
    window.dispatchEvent(new CustomEvent(type));
    localStorage.setItem(type, String(Date.now()));
    localStorage.removeItem(type);
  };

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
      notify('nfes_updated');
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
      notify('nfes_updated');
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
        notify('nfe_updated');
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
      notify('nfe_updated');
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
        notify('nfe_updated');
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
        notify('nfe_updated');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar frete proporcional do produto');
    }
  };

  const updateHiddenItems = async (nfeId: string, hiddenItems: string[]) => {
    try {
      await updateNFE(nfeId, { hiddenItems });
      notify('nfe_updated');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar itens ocultos');
    }
  };

  const updateShowHidden = async (nfeId: string, showHidden: boolean) => {
    try {
      await updateNFE(nfeId, { showHidden });
      notify('nfe_updated');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar preferencia de ocultos');
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
    // expor updateNFE genérico para permitir atualizar markups e outros campos
    updateNFE,
    updateProdutoCustoExtra,
    updateProdutoFreteProporcional,
    updateHiddenItems,
    updateShowHidden,
    loadNFEs,
    loadNFEById,
  };
}; 