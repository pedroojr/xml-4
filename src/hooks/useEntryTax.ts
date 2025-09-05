import { useState, useEffect } from 'react';

export const useEntryTax = (initialValue: number = 0) => {
  const [entryTax, setEntryTax] = useState(() => {
    const saved = localStorage.getItem('entryTax');
    return saved ? Number(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem('entryTax', entryTax.toString());
  }, [entryTax]);

  const handleEntryTaxChange = (value: number) => {
    setEntryTax(value);
  };

  return {
    entryTax,
    setEntryTax: handleEntryTaxChange,
  };
};

