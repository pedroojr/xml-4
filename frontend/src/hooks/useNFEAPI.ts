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
      
      // Adicionar/atualizar NFE na lista local evitando duplicatas por ID
      const savedId = result.data?.id ?? nfe.id;
      const savedNfe: NFE = { ...nfe, id: savedId, produtos: Array.isArray(nfe.produtos) ? nfe.produtos : [] };
      setNfes(prev => {
        const exists = prev.some(item => item.id === savedId);
        return exists
          ? prev.map(item => (item.id === savedId ? savedNfe : item))
          : [...prev, savedNfe];
      });
      console.log('📝 NFE sincronizada na lista local (sem duplicar)');
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
      setNfes(prev => prev.map(nfe => nfe.id === id ? { ...nfe, ...data } : nfe));
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
      toast.success('NFE excluída com sucesso!');
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

  // Excluir todas as NFEs
  const deleteAllNFEs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await nfeAPI.deleteAll();
      // Limpar lista local
      setNfes([]);
      toast.success('Todas as NFEs excluídas com sucesso!');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir todas as NFEs';
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
    deleteAllNFEs,
    loadNFEById,
  };
};