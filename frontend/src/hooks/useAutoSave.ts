import { useEffect, useRef, useCallback } from 'react';
import { useNFEStorage } from './useNFEStorage';
import { NFE } from './useNFEStorage';

interface UseAutoSaveOptions {
  delay?: number; // Delay em ms para debounce
  enabled?: boolean; // Se o auto-save está habilitado
}

export const useAutoSave = (nfe: NFE | null, options: UseAutoSaveOptions = {}) => {
  const { delay = 2000, enabled = true } = options;
  const { saveNFE } = useNFEStorage();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);

  // Função para salvar com debounce
  const debouncedSave = useCallback(async (nfeToSave: NFE) => {
    if (!enabled || isSavingRef.current) return;

    // Limpa timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Cria novo timeout para salvar
    timeoutRef.current = setTimeout(async () => {
      try {
        // Verifica se já está salvo antes de iniciar
        const snapshot = JSON.stringify(nfeToSave);
        if (snapshot === lastSavedRef.current) {
          return;
        }

        isSavingRef.current = true;
        console.log('🔄 Auto-save iniciado para NFE:', nfeToSave.id);
        await saveNFE(nfeToSave);
        lastSavedRef.current = snapshot;
        console.log('✅ Auto-save concluído para NFE:', nfeToSave.id);
      } catch (error) {
        console.error('❌ Erro no auto-save:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);
  }, [saveNFE, delay, enabled]);

  // Função para salvar imediatamente (usado antes de sair da página)
  const saveImmediately = useCallback(async (nfeToSave: NFE) => {
    if (!enabled || isSavingRef.current) return;

    // Limpa qualquer timeout pendente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      isSavingRef.current = true;
      console.log('💾 Salvamento imediato iniciado para NFE:', nfeToSave.id);
      await saveNFE(nfeToSave);
      lastSavedRef.current = JSON.stringify(nfeToSave);
      console.log('✅ Salvamento imediato concluído para NFE:', nfeToSave.id);
    } catch (error) {
      console.error('❌ Erro no salvamento imediato:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [saveNFE, enabled]);

  // Effect para detectar mudanças na NFE e acionar auto-save
  useEffect(() => {
    if (!nfe || !enabled) return;

    const currentNFEString = JSON.stringify(nfe);
    
    // Só salva se houve mudanças
    if (currentNFEString !== lastSavedRef.current) {
      debouncedSave(nfe);
    }
  }, [nfe, debouncedSave, enabled]);

  // Effect para salvar antes de sair da página
  useEffect(() => {
    if (!enabled || !nfe) return;

    const handleBeforeUnload = async () => {
      const currentNFEString = JSON.stringify(nfe);
      
      // Só salva se houve mudanças não salvas
      if (currentNFEString !== lastSavedRef.current) {
        await saveImmediately(nfe);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && nfe) {
        const currentNFEString = JSON.stringify(nfe);
        
        // Só salva se houve mudanças não salvas
        if (currentNFEString !== lastSavedRef.current) {
          await saveImmediately(nfe);
        }
      }
    };

    // Adiciona listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Remove listeners
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Limpa timeout se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nfe, enabled, saveImmediately]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveImmediately: (nfeToSave: NFE) => saveImmediately(nfeToSave),
    isSaving: isSavingRef.current
  };
};