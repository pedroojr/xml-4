import { useEffect, useCallback, useRef } from 'react';
import { useNFEAPI } from './useNFEAPI';
import { NFE } from '@/services/api';
import { debounce } from 'lodash';

const AUTOSAVE_DELAY = 1800; // 1.8s para reduzir bursts

// Campos permitidos para auto-save
const ALLOWED_FIELDS = [
  'xapuriMarkup',
  'epitaMarkup',
  'impostoEntrada',
  'roundingType',
  'valorFrete',
  'hiddenItems',
  'modo_detalhado',
  'produtos'
];

// Helper para filtrar apenas campos permitidos
const filterAllowedFields = (changes: Partial<NFE>): Partial<NFE> => {
  return Object.entries(changes).reduce(
    (acc, [key, value]) => {
      if (ALLOWED_FIELDS.includes(key)) {
        (acc as any)[key] = value;
      }
      return acc;
    },
    {} as Partial<NFE>
  );
};

export const useAutoSave = (nfe: NFE | null, options?: { enabled?: boolean }) => {
  const { updateNFE } = useNFEAPI();
  const isSavingRef = useRef(false);
  const pendingRef = useRef<{ id: string; data: Partial<NFE> } | null>(null);
  const backoffRef = useRef(0);
  const enabled = options?.enabled ?? true;

  const executeSave = useCallback(async (id: string, data: Partial<NFE>) => {
    if (isSavingRef.current) {
      // Guardar última alteração para executar após concluir a atual
      pendingRef.current = { id, data };
      return;
    }

    isSavingRef.current = true;
    try {
      await updateNFE(id, data);
      backoffRef.current = 0; // sucesso: reset backoff
    } catch (error: any) {
      // Se backend respondeu 429, aplicar backoff exponencial com jitter e re-enfileirar
      const status = error?.status ?? error?.response?.status;
      if (status === 429) {
        const base = backoffRef.current || 500; // inicia em 500ms
        const next = Math.min(base * 2, 8000); // teto 8s
        backoffRef.current = next;
        const jitter = Math.random() * 200; // +/-200ms
        setTimeout(() => {
          pendingRef.current = { id, data };
          // Tentar novamente após backoff
          void executeSave(id, data);
        }, next + jitter);
      } else {
        console.error('❌ Erro no auto-save:', error);
      }
    } finally {
      isSavingRef.current = false;
      // Se houve mudanças pendentes enquanto salvava, executar a última (coalescing)
      if (pendingRef.current) {
        const nextJob = pendingRef.current;
        pendingRef.current = null;
        void executeSave(nextJob.id, nextJob.data);
      }
    }
  }, [updateNFE]);

  // Função de auto-save com debounce
  const debouncedSave = useCallback(
    debounce((id: string, data: Partial<NFE>) => {
      void executeSave(id, data);
    }, AUTOSAVE_DELAY),
    [executeSave]
  );

  // Função para salvar alterações (com debounce)
  const saveChanges = useCallback(
    (changes: Partial<NFE>) => {
      if (!nfe?.id) {
        console.warn('⚠️ Tentativa de auto-save sem ID da NFE');
        return;
      }
      if (!enabled) return;

      const filteredChanges = filterAllowedFields(changes);
      if (Object.keys(filteredChanges).length > 0) {
        debouncedSave(nfe.id, filteredChanges);
      }
    },
    [nfe?.id, debouncedSave, enabled]
  );

  // Função para salvar imediatamente (sem debounce)
  const saveImmediately = useCallback(
    (changes: Partial<NFE>) => {
      if (!nfe?.id) {
        console.warn('⚠️ Tentativa de saveImmediately sem ID da NFE');
        return;
      }
      if (!enabled) return;

      const filteredChanges = filterAllowedFields(changes);
      if (Object.keys(filteredChanges).length > 0) {
        void executeSave(nfe.id, filteredChanges);
      }
    },
    [nfe?.id, executeSave, enabled]
  );

  // Salvar antes de sair da página ou mudar a visibilidade
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        debouncedSave.flush();
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      debouncedSave.flush();
      delete event.returnValue;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      debouncedSave.flush();
    };
  }, [debouncedSave]);

  return { saveChanges, saveImmediately };
};