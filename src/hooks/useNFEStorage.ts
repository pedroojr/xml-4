import { useState, useEffect } from 'react';
import { useNFEAPI } from './useNFEAPI';
import { Product } from '../types/nfe';

export interface NFE {
  id: string;
  date: string;
  number: string;
  supplier: string;
  value: number;
  items: number;
  products: Product[];
  brandName?: string;
  invoiceNumber?: string;
  isFavorite?: boolean;
  nfeKey?: string;
  entryTax: number;
  xapuriMarkup?: number;
  epitaMarkup?: number;
  roundingType?: string;
  freightValue?: number;
  hiddenItems?: (string | number)[]; // pode ser código (string) ou índice legado (number)
  showHidden?: boolean;
}

export const useNFEStorage = () => {
  const { nfes: savedNFEs, loading, error, loadNFEs, saveNFE: apiSaveNFE, updateNFE, deleteNFE: apiDeleteNFE } = useNFEAPI();

  // Sincronização em tempo real entre abas/dispositivos
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Recarregar NFEs quando houver mudança em outra aba
      if (e.key === 'nfes_updated' || e.key === 'nfe_updated') {
        loadNFEs();
      }
    };

    // Listener para mudanças de storage (outras abas)
    window.addEventListener('storage', handleStorageChange);
    
    // Listener para mudanças na mesma aba (via CustomEvent)
    const handleCustomStorageChange = () => {
      loadNFEs();
    };
    
    window.addEventListener('nfes_updated', handleCustomStorageChange);
    window.addEventListener('nfe_updated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('nfes_updated', handleCustomStorageChange);
      window.removeEventListener('nfe_updated', handleCustomStorageChange);
    };
  }, [loadNFEs]);

  // Polling leve para sincronizar entre dispositivos (a cada 3s quando a aba estiver visível)
  useEffect(() => {
    let intervalId: number | undefined;
    const startPolling = () => {
      stopPolling();
      intervalId = window.setInterval(() => {
        if (!document.hidden) {
          loadNFEs();
        }
      }, 3000);
    };
    const stopPolling = () => {
      if (intervalId) window.clearInterval(intervalId);
    };

    startPolling();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopPolling(); else startPolling();
    });

    return () => {
      stopPolling();
    };
  }, [loadNFEs]);

  // Função para notificar outras abas sobre mudanças
  const notifyOtherTabs = (eventType: 'nfes_updated' | 'nfe_updated') => {
    // Disparar evento customizado para a mesma aba
    window.dispatchEvent(new CustomEvent(eventType));
    
    // Notificar outras abas via localStorage
    localStorage.setItem(eventType, Date.now().toString());
    localStorage.removeItem(eventType);
  };

  const checkDuplicateNFE = (nfeKey: string | undefined): boolean => {
    if (!nfeKey) return false;
    return savedNFEs.some(nfe => nfe.nfeKey === nfeKey);
  };

  const saveNFE = async (nfe: NFE) => {
    try {
      // Verifica se já existe uma nota com a mesma chave
      if (nfe.nfeKey && checkDuplicateNFE(nfe.nfeKey)) {
        // Se for uma atualização da mesma nota (mesmo ID), permite
        const existingNFE = savedNFEs.find(saved => saved.id === nfe.id);
        if (!existingNFE) {
          throw new Error('Esta nota fiscal já foi cadastrada anteriormente');
        }
      }

      // Salva via API
      await apiSaveNFE(nfe);
      
      // Atualiza lista e notifica outras abas
      await loadNFEs();
      notifyOtherTabs('nfes_updated');
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
      
      // Atualiza lista e notifica outras abas
      await loadNFEs();
      notifyOtherTabs('nfes_updated');
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
        
        // Atualiza lista e notifica outras abas
        await loadNFEs();
        notifyOtherTabs('nfe_updated');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar favorito');
    }
  };

  const updateNFEEntryTax = async (id: string, entryTax: number) => {
    try {
      await updateNFE(id, { entryTax });
      
      // Atualiza lista e notifica outras abas
      await loadNFEs();
      notifyOtherTabs('nfe_updated');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar imposto de entrada');
    }
  };

  const updateProductExtraCost = async (nfeId: string, productCode: string, extraCost: number) => {
    try {
      const nfe = savedNFEs.find(n => n.id === nfeId);
      if (nfe) {
        const updatedProducts = nfe.products.map(produto =>
          produto.code === productCode
            ? { ...produto, extraCost }
            : produto
        );
        await updateNFE(nfeId, { products: updatedProducts });
        
        // Atualiza lista e notifica outras abas
        await loadNFEs();
        notifyOtherTabs('nfe_updated');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar custo extra do produto');
    }
  };

  const updateProductFreightShare = async (nfeId: string, productCode: string, freightShare: number) => {
    try {
      const nfe = savedNFEs.find(n => n.id === nfeId);
      if (nfe) {
        const updatedProducts = nfe.products.map(produto =>
          produto.code === productCode
            ? { ...produto, freightShare }
            : produto
        );
        await updateNFE(nfeId, { products: updatedProducts });
        
        // Atualiza lista e notifica outras abas
        await loadNFEs();
        notifyOtherTabs('nfe_updated');
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
      
      // Atualiza lista e notifica outras abas IMEDIATAMENTE
      await loadNFEs();
      notifyOtherTabs('nfe_updated');
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
      
      // Atualiza lista e notifica outras abas IMEDIATAMENTE
      await loadNFEs();
      notifyOtherTabs('nfe_updated');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao atualizar modo de exibição');
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
    updateNFE,
    updateNFEEntryTax,
    updateProductExtraCost,
    updateProductFreightShare,
    updateHiddenItems,
    updateShowHidden,
    loadNFEs,
  };
};