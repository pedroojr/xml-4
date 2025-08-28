import { useState, useEffect } from 'react';

export const useImpostoEntrada = (initialValue: number = 0) => {
  const [impostoEntrada, setImpostoEntrada] = useState(() => {
    const saved = localStorage.getItem('impostoEntrada');
    return saved ? Number(saved) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem('impostoEntrada', impostoEntrada.toString());
  }, [impostoEntrada]);

  const handleImpostoEntradaChange = (value: number) => {
    setImpostoEntrada(value);
  };

  return {
    impostoEntrada,
    setImpostoEntrada: handleImpostoEntradaChange,
  };
}; 