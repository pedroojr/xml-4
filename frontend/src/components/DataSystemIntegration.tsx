import React from 'react';

interface DataSystemIntegrationProps {
  xmlContent: string | null;
}

export const DataSystemIntegration: React.FC<DataSystemIntegrationProps> = ({ xmlContent }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Integração com Sistema de Dados</h2>
      <div className="space-y-4">
        {xmlContent ? (
          <p>Analisando XML no DataSystem...</p>
        ) : (
          <p>Aguardando arquivo XML para análise...</p>
        )}
      </div>
    </div>
  );
};

export default DataSystemIntegration; 