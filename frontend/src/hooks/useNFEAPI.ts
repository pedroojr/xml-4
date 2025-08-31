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
      // Garantir que cada NFE tenha a propriedade produtos como array
      const nfesWithProducts = data.map(nfe => ({
        ...nfe,
        produtos: Array.isArray(nfe.produtos) ? nfe.produtos : []
      }));
      setNfes(nfesWithProducts);
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
    console.log('🚀 useNFEAPI.saveNFE iniciado para:', nfe.id);
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Chamando nfeAPI.save com dados:', {
        id: nfe.id,
        fornecedor: nfe.fornecedor,
        valor: nfe.valor,
        itens: nfe.itens
      });
      
      const result = await nfeAPI.save(nfe);
      console.log('✅ nfeAPI.save retornou:', result);
      
      // Adicionar NFE à lista local em vez de recarregar tudo
      if (result.nfe) {
        setNfes(prev => [...prev, result.nfe]);
        console.log('📝 NFE adicionada à lista local');
      } else {
        // Fallback: recarregar apenas se não tiver a NFE no resultado
        console.log('🔄 Recarregando lista de NFEs (fallback)');
        await loadNFEs();
      }
      toast.success(result.message);
      return result;
    } catch (err) {
      console.error('❌ Erro em useNFEAPI.saveNFE:', {
        nfeId: nfe.id,
        error: err,
        errorType: typeof err,
        errorMessage: err instanceof Error ? err.message : 'Erro desconhecido'
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar NFE';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      console.log('🏁 useNFEAPI.saveNFE finalizado para:', nfe.id);
    }
  }, [loadNFEs]);

  // Atualizar NFE
  const updateNFE = useCallback(async (id: string, data: Partial<NFE>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await nfeAPI.update(id, data);
      // Atualizar NFE na lista local em vez de recarregar tudo
      if (result.nfe) {
        setNfes(prev => prev.map(nfe => nfe.id === id ? result.nfe : nfe));
      } else {
        // Fallback: recarregar apenas se não tiver a NFE no resultado
        await loadNFEs();
      }
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
      // Remover NFE da lista local em vez de recarregar tudo
      setNfes(prev => prev.filter(nfe => nfe.id !== id));
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
  }, []);

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