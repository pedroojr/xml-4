import { useEffect, useState } from 'react';

/**
 * Hook to manage hidden items per NFE. It syncs the hidden item IDs with
 * localStorage and optionally persists them on the server.
 */
export function useHiddenItems(
  nfeId: string | null,
  serverHiddenItems: string[] | undefined,
  updateHiddenItems?: (id: string, items: string[]) => void,
  reload?: () => void,
) {
  const storageKey = nfeId ? `hidden-items:${nfeId}` : '';

  const [hiddenItems, setHiddenItems] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    } catch {
      return new Set();
    }
  });

  // When NFE changes, prefer server state and fall back to localStorage
  useEffect(() => {
    if (!nfeId) {
      setHiddenItems(new Set());
      return;
    }

    const serverIds = new Set<string>(Array.isArray(serverHiddenItems) ? serverHiddenItems : []);
    let localIds: string[] = [];
    try {
      localIds = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      localIds = [];
    }
    const localSet = new Set(localIds);
    const finalSet = serverIds.size > 0 ? serverIds : localSet;
    setHiddenItems(finalSet);
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(finalSet)));
    } catch {
      /* ignore */
    }
  }, [nfeId, serverHiddenItems]);

  // Persist changes to localStorage
  useEffect(() => {
    if (storageKey && hiddenItems.size > 0) {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(hiddenItems)));
    } else if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [hiddenItems, storageKey]);

  const toggleHiddenById = (id: string) => {
    let nextArray: string[] = [];
    setHiddenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      nextArray = Array.from(next);
      return next;
    });

    if (nfeId && updateHiddenItems) {
      updateHiddenItems(nfeId, nextArray);
      reload?.();
    }
  };

  return { hiddenItems, setHiddenItems, toggleHiddenById };
}

export default useHiddenItems;
