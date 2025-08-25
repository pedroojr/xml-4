import { useState, useEffect } from 'react';

interface ProductSettings {
  hiddenItems: Set<number>;
  visibleColumns: Set<string>;
  xapuriMarkup: number;
  epitaMarkup: number;
  roundingType: 'none' | '50' | '90';
  impostoEntrada: number;
  showOnlyWithImage: boolean;
  showOnlyHidden: boolean;
}

export function useProductSettings(defaultSettings: Partial<ProductSettings> = {}) {
  // Inicializa o estado com valores do localStorage ou valores padrão
  const [settings, setSettings] = useState<ProductSettings>(() => {
    const savedSettings = localStorage.getItem('productSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return {
        hiddenItems: new Set(parsed.hiddenItems || []),
        visibleColumns: new Set(parsed.visibleColumns || []),
        xapuriMarkup: parsed.xapuriMarkup || 120,
        epitaMarkup: parsed.epitaMarkup || 130,
        roundingType: parsed.roundingType || 'none',
        impostoEntrada: parsed.impostoEntrada || 0,
        showOnlyWithImage: parsed.showOnlyWithImage || false,
        showOnlyHidden: parsed.showOnlyHidden || false,
        ...defaultSettings
      };
    }
    return {
      hiddenItems: new Set(),
      visibleColumns: new Set(),
      xapuriMarkup: 120,
      epitaMarkup: 130,
      roundingType: 'none',
      impostoEntrada: 0,
      showOnlyWithImage: false,
      showOnlyHidden: false,
      ...defaultSettings
    };
  });

  // Salva as configurações no localStorage sempre que houver mudanças
  useEffect(() => {
    const settingsToSave = {
      ...settings,
      hiddenItems: Array.from(settings.hiddenItems),
      visibleColumns: Array.from(settings.visibleColumns)
    };
    localStorage.setItem('productSettings', JSON.stringify(settingsToSave));
  }, [settings]);

  // Funções para atualizar as configurações
  const toggleHiddenItem = (id: number) => {
    setSettings(prev => {
      const newHiddenItems = new Set(prev.hiddenItems);
      if (newHiddenItems.has(id)) {
        newHiddenItems.delete(id);
      } else {
        newHiddenItems.add(id);
      }
      return { ...prev, hiddenItems: newHiddenItems };
    });
  };

  const toggleVisibleColumn = (columnId: string) => {
    setSettings(prev => {
      const newVisibleColumns = new Set(prev.visibleColumns);
      if (newVisibleColumns.has(columnId)) {
        newVisibleColumns.delete(columnId);
      } else {
        newVisibleColumns.add(columnId);
      }
      return { ...prev, visibleColumns: newVisibleColumns };
    });
  };

  const updateMarkup = (type: 'xapuri' | 'epita', value: number) => {
    setSettings(prev => ({
      ...prev,
      [type === 'xapuri' ? 'xapuriMarkup' : 'epitaMarkup']: value
    }));
  };

  const updateRoundingType = (type: 'none' | '50' | '90') => {
    setSettings(prev => ({ ...prev, roundingType: type }));
  };

  const updateImpostoEntrada = (value: number) => {
    setSettings(prev => ({ ...prev, impostoEntrada: value }));
  };

  const toggleShowOnlyWithImage = () => {
    setSettings(prev => ({ ...prev, showOnlyWithImage: !prev.showOnlyWithImage }));
  };

  const toggleShowOnlyHidden = () => {
    setSettings(prev => ({ ...prev, showOnlyHidden: !prev.showOnlyHidden }));
  };

  return {
    settings,
    toggleHiddenItem,
    toggleVisibleColumn,
    updateMarkup,
    updateRoundingType,
    updateImpostoEntrada,
    toggleShowOnlyWithImage,
    toggleShowOnlyHidden
  };
} 