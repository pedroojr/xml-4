import { useState, useEffect, useCallback } from 'react';
import { nfeAPI, NFE } from '@/services/api';
import { toast } from 'sonner';

export const useNFEAPI = () => {
  const [nfes, setNfes] = useState<NFE[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar todas as NFEs
  const loadNFEs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nfeAPI.getAll();
      setNfes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar NFEs';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar NFE
  const saveNFE = useCallback(async (nfe: NFE) => {
    setLoading(true);
    setError(null);
    try {
      const result = await nfeAPI.save(nfe);
      await loadNFEs(); // Recarregar lista
      toast.success(result.message);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar NFE';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadNFEs]);

  // Atualizar NFE
  const updateNFE = useCallback(async (id: string, data: Partial<NFE>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await nfeAPI.update(id, data);
      await loadNFEs(); // Recarregar lista
      toast.success(result.message);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar NFE';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadNFEs]);

  // Excluir NFE
  const deleteNFE = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await nfeAPI.delete(id);
      await loadNFEs(); // Recarregar lista
      toast.success(result.message);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir NFE';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadNFEs]);

  // Carregar NFE por ID
  const loadNFEById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const nfe = await nfeAPI.getById(id);
      return nfe;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar NFE';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar NFEs na inicialização
  useEffect(() => {
    loadNFEs();
  }, [loadNFEs]);

  return {
    nfes,
    loading,
    error,
    loadNFEs,
    saveNFE,
    updateNFE,
    deleteNFE,
    loadNFEById,
  };
}; 