import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Search, FileText, Globe, Key, AlertCircle, CheckCircle } from 'lucide-react';

interface XmlIntegrationProps {
  onXmlReceived: (xmlContent: string) => void;
}

export const XmlIntegration: React.FC<XmlIntegrationProps> = ({ onXmlReceived }) => {
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [cnpjEmitente, setCnpjEmitente] = useState('');
  const [numeroNFe, setNumeroNFe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [xmlUrl, setXmlUrl] = useState('');

  const handleConsultaSEFAZ = async () => {
    if (!chaveAcesso || chaveAcesso.length !== 44) {
      setMessage({ type: 'error', text: 'Chave de acesso deve ter 44 dígitos' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Consultando SEFAZ...' });

    try {
      // Simular consulta SEFAZ (implementar integração real posteriormente)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Exemplo de XML simulado
      const xmlSimulado = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <!-- XML da NFe consultada via SEFAZ -->
  <!-- Chave: ${chaveAcesso} -->
  <NFe>
    <infNFe Id="NFe${chaveAcesso}">
      <ide>
        <cUF>35</cUF>
        <cNF>12345678</cNF>
        <natOp>Venda</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${numeroNFe || '000001'}</nNF>
      </ide>
    </infNFe>
  </NFe>
</nfeProc>`;
      
      onXmlReceived(xmlSimulado);
      setMessage({ type: 'success', text: 'XML obtido com sucesso da SEFAZ!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao consultar SEFAZ. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFromUrl = async () => {
    if (!xmlUrl) {
      setMessage({ type: 'error', text: 'Digite uma URL válida' });
      return;
    }

    setIsLoading(true);
    setMessage({ type: 'info', text: 'Baixando XML...' });

    try {
      const response = await fetch(xmlUrl);
      if (!response.ok) throw new Error('Erro ao baixar arquivo');
      
      const xmlContent = await response.text();
      onXmlReceived(xmlContent);
      setMessage({ type: 'success', text: 'XML baixado com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao baixar XML. Verifique a URL.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatChaveAcesso = (value: string) => {
    // Remove caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    // Limita a 44 dígitos
    return numbers.slice(0, 44);
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 14);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Integração XML</h2>
        <p className="text-gray-600">Obtenha XMLs de NFe através de diferentes métodos</p>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                        message.type === 'success' ? 'border-green-200 bg-green-50' : 
                        'border-blue-200 bg-blue-50'}>
          {message.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
          {message.type === 'info' && <Search className="h-4 w-4 text-blue-600" />}
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 
                                    message.type === 'success' ? 'text-green-700' : 
                                    'text-blue-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="sefaz" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sefaz" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Consulta SEFAZ
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Download URL
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Entrada Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sefaz">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Consulta por Chave de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chave de Acesso (44 dígitos)</label>
                <Input
                  placeholder="Digite a chave de acesso da NFe"
                  value={chaveAcesso}
                  onChange={(e) => setChaveAcesso(formatChaveAcesso(e.target.value))}
                  maxLength={44}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {chaveAcesso.length}/44 dígitos
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">CNPJ Emitente (opcional)</label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={cnpjEmitente}
                    onChange={(e) => setCnpjEmitente(formatCNPJ(e.target.value))}
                    maxLength={14}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Número NFe (opcional)</label>
                  <Input
                    placeholder="000001"
                    value={numeroNFe}
                    onChange={(e) => setNumeroNFe(e.target.value.replace(/\D/g, ''))}
                    maxLength={9}
                  />
                </div>
              </div>

              <Button 
                onClick={handleConsultaSEFAZ}
                disabled={isLoading || chaveAcesso.length !== 44}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Consultando SEFAZ...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Consultar SEFAZ
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Download de URL
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">URL do XML</label>
                <Input
                  placeholder="https://exemplo.com/nfe.xml"
                  value={xmlUrl}
                  onChange={(e) => setXmlUrl(e.target.value)}
                  type="url"
                />
              </div>

              <Button 
                onClick={handleDownloadFromUrl}
                disabled={isLoading || !xmlUrl}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Baixando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Baixar XML
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Entrada Manual de XML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Conteúdo XML</label>
                <textarea
                  className="w-full h-40 p-3 border rounded-md font-mono text-sm"
                  placeholder="Cole aqui o conteúdo XML da NFe..."
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      onXmlReceived(e.target.value);
                      setMessage({ type: 'success', text: 'XML processado com sucesso!' });
                    }
                  }}
                />
              </div>
              
              <div className="text-sm text-gray-600">
                <p>💡 <strong>Dica:</strong> Cole o conteúdo XML completo da NFe no campo acima.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default XmlIntegration;