import { useEffect } from 'react';
import type { NFE } from '@/services/api';
import type { Product } from '@/types/nfe';
import type { RoundingType } from '@/components/product-preview/productCalculations';

interface UseNfeSyncParams {
  currentNFeId: string | null;
  products: Product[];
  invoiceNumber: string;
  brandName: string;
  impostoEntrada: number;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: RoundingType;
  hiddenItems: Set<string>;
  showHidden: boolean;
  pendingChanges: Record<string, unknown>;
  loadNFEs: () => void;
  updateNFE: (id: string, data: Partial<NFE>) => Promise<void>;
}

/**
 * Hook responsible for synchronizing NFE data with the backend.
 * - Periodically reloads NFEs when there are no pending changes.
 * - Persists current NFE before the user leaves the page.
 */
export function useNfeSync({
  currentNFeId,
  products,
  invoiceNumber,
  brandName,
  impostoEntrada,
  xapuriMarkup,
  epitaMarkup,
  roundingType,
  hiddenItems,
  showHidden,
  pendingChanges,
  loadNFEs,
  updateNFE,
}: UseNfeSyncParams) {
  // Periodic reload
  useEffect(() => {
    if (currentNFeId) {
      const syncInterval = setInterval(() => {
        if (Object.keys(pendingChanges).length === 0) {
          loadNFEs();
        }
      }, 5000);
      return () => clearInterval(syncInterval);
    }
  }, [currentNFeId, pendingChanges, loadNFEs]);

  // Persist before leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentNFeId && products.length > 0) {
        const nfe: Partial<NFE> = {
          id: currentNFeId,
          data: new Date().toISOString().split('T')[0],
          numero: invoiceNumber,
          fornecedor: brandName,
          valor: products.reduce((sum, p) => sum + p.totalPrice, 0),
          itens: products.length,
          produtos: products,
          impostoEntrada,
          xapuriMarkup,
          epitaMarkup,
          roundingType,
          hiddenItems: Array.from(hiddenItems),
          showHidden,
        };
        updateNFE(currentNFeId, nfe);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    currentNFeId,
    products,
    invoiceNumber,
    brandName,
    impostoEntrada,
    xapuriMarkup,
    epitaMarkup,
    roundingType,
    hiddenItems,
    showHidden,
    updateNFE,
  ]);
}

export default useNfeSync;
