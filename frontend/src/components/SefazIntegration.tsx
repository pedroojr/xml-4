import React from 'react';

interface SefazIntegrationProps {
  onXmlReceived: (xmlContent: string) => void;
}

export const SefazIntegration: React.FC<SefazIntegrationProps> = ({ onXmlReceived }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Integração SEFAZ</h2>
      <div className="space-y-4">
        {/* Adicione o conteúdo do componente aqui */}
        <p>Componente de integração com a SEFAZ em desenvolvimento...</p>
      </div>
    </div>
  );
};

export default SefazIntegration; 