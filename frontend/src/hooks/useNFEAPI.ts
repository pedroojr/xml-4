import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nfeAPI, NFE } from '@/services/api';
import { toast } from 'sonner';

export const useNFEAPI = () => {
  const queryClient = useQueryClient();

  const {
    data: nfes = [],
    isLoading,
    error,
    refetch,
  } = useQuery<NFE[], Error>({
    queryKey: ['nfes'],
    queryFn: nfeAPI.getAll,
  });

  const saveMutation = useMutation({
    mutationFn: nfeAPI.save,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['nfes'] });
      toast.success(result.message);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao salvar NFE';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NFE> }) =>
      nfeAPI.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['nfes'] });
      toast.success(result.message);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar NFE';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => nfeAPI.delete(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['nfes'] });
      toast.success(result.message);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Erro ao excluir NFE';
      toast.error(message);
    },
  });

  const loadNFEById = useCallback(
    async (id: string) => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ['nfe', id],
          queryFn: () => nfeAPI.getById(id),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao carregar NFE';
        toast.error(message);
        throw err;
      }
    },
    [queryClient]
  );

  return {
    nfes,
    loading: isLoading,
    error: error ? error.message : null,
    loadNFEs: refetch,
    saveNFE: saveMutation.mutateAsync,
    updateNFE: (id: string, data: Partial<NFE>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteNFE: deleteMutation.mutateAsync,
    loadNFEById,
  };
};
