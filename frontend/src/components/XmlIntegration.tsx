import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface XmlIntegrationProps {
  onXmlReceived: (xmlContent: string) => void;
}

export const XmlIntegration: React.FC<XmlIntegrationProps> = ({ onXmlReceived }) => {
  const [xmlUrl, setXmlUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

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
          {message.type === 'info' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />}
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 
                                    message.type === 'success' ? 'text-green-700' : 
                                    'text-blue-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download URL
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Entrada Manual
          </TabsTrigger>
        </TabsList>

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