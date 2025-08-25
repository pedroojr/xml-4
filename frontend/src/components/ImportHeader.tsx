import React from 'react';

interface ImportHeaderProps {
  totalNotes?: number;
}

export const ImportHeader: React.FC<ImportHeaderProps> = ({ totalNotes }) => {
  return (
    <div className="sticky top-0 z-50 bg-white border-b border-slate-200 pb-4 mb-6">
      <div className="w-full px-4 py-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">
          Importação de Produtos
        </h1>
        <p className="text-sm text-slate-600">
          Envie arquivos XML de NF-e e importe produtos facilmente
          {totalNotes && (
            <span className="ml-2 text-slate-500">
              • {totalNotes} {totalNotes === 1 ? 'nota importada' : 'notas importadas'}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}; 