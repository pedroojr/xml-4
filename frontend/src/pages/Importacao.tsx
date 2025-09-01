import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { xmlService } from '@/services/xmlService';
import { uploadAPI } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FileStatus = 'pending' | 'valid' | 'invalid';

interface FileWithStatus extends File {
  status: FileStatus;
  info?: any;
}

const NFECard = ({ info }: { info: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">NF-e #{info.numero}</CardTitle>
            <p className="text-sm text-gray-500">Chave de Acesso: {info.chaveAcesso}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-sm text-gray-500">Emitente</h4>
            <p className="text-sm">{info.emitente.nome}</p>
            <p className="text-sm text-gray-600">CNPJ: {info.emitente.cnpj}</p>
            <p className="text-sm text-gray-600">IE: {info.emitente.ie}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-500">Destinatário</h4>
            <p className="text-sm">{info.destinatario.nome}</p>
            <p className="text-sm text-gray-600">CNPJ: {info.destinatario.cnpj}</p>
            <p className="text-sm text-gray-600">IE: {info.destinatario.ie}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-500">Datas</h4>
            <p className="text-sm">Emissão: {formatDate(info.dataEmissao || info.data)}</p>
            <p className="text-sm">Entrada: {formatDate(info.dataEntrada)}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm text-gray-500">Valores</h4>
            <p className="text-sm">Total: {formatCurrency(info.valorTotal)}</p>
            <p className="text-sm">ICMS: {formatCurrency(info.valorICMS)}</p>
            <p className="text-sm">IPI: {formatCurrency(info.valorIPI)}</p>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4">
            <h4 className="font-medium text-sm text-gray-500 mb-2">Itens</h4>
            <div className="space-y-2">
              {info.itens.map((item: any, index: number) => (
                <div key={index} className="p-2 bg-gray-50 rounded">
                  <p className="text-sm font-medium">{item.descricao}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <p className="text-xs text-gray-600">Código: {item.codigo}</p>
                    <p className="text-xs text-gray-600">NCM: {item.ncm}</p>
                    <p className="text-xs text-gray-600">Qtd: {item.quantidade}</p>
                    <p className="text-xs text-gray-600">Valor Unitário: {formatCurrency(item.valorUnitario)}</p>
                    <p className="text-xs text-gray-600">Valor Total: {formatCurrency(item.valorTotal)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DuplicateConfirmation {
  file: File;
  duplicateInfo: {
    existingNfe: {
      id: string;
      numero: string;
      fornecedor: string;
      valor: number;
    };
    newNfe: {
      numero: string;
      fornecedor: string;
      valor: number;
    };
    question: string;
    options: {
      replace: string;
      cancel: string;
    };
  };
}

const Importacao = () => {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [duplicateConfirmation, setDuplicateConfirmation] = useState<DuplicateConfirmation | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const xmlFiles = acceptedFiles.filter(file => file.type === 'text/xml' || file.name.endsWith('.xml'));
    
    // Validar cada arquivo XML
    const validatedFiles = await Promise.all(
      xmlFiles.map(async (file) => {
        const isValid = await xmlService.validateXML(file);
        const info = isValid ? await xmlService.extractNFEInfo(file) : null;
        
        return {
          ...file,
          status: isValid ? 'valid' as FileStatus : 'invalid' as FileStatus,
          info
        };
      })
    );

    setFiles(prev => [...prev, ...validatedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml']
    },
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        if (file.status !== 'valid') continue;
        
        try {
          const result = await uploadAPI.uploadWithConfirmation(file, false);
          
          if (result.success) {
            toast.success(`Arquivo ${file.name} processado com sucesso!`);
          } else if (result.isDuplicate && result.confirmationRequired) {
            // Mostrar diálogo de confirmação para duplicata
            setDuplicateConfirmation({
              file,
              duplicateInfo: {
                existingNfe: result.existingNfe!,
                newNfe: result.newNfe!,
                question: result.question!,
                options: result.options!
              }
            });
            setIsUploading(false);
            return; // Parar o processamento até a confirmação
          } else {
            toast.error(result.error || 'Erro ao processar arquivo');
          }
        } catch (error: any) {
          if (error.response?.status === 409 && error.response?.data?.isDuplicate) {
            // Duplicata detectada
            const duplicateData = error.response.data;
            setDuplicateConfirmation({
              file,
              duplicateInfo: {
                existingNfe: duplicateData.existingNfe,
                newNfe: duplicateData.newNfe,
                question: duplicateData.question,
                options: duplicateData.options
              }
            });
            setIsUploading(false);
            return;
          } else {
            toast.error(`Erro ao processar ${file.name}: ${error.message}`);
          }
        }
      }
      
      setFiles([]);
    } catch (error) {
      toast.error('Erro ao processar arquivos. Por favor, tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!duplicateConfirmation) return;
    
    setIsUploading(true);
    try {
      const result = await uploadAPI.uploadWithConfirmation(duplicateConfirmation.file, true);
      
      if (result.success) {
        toast.success(`Arquivo ${duplicateConfirmation.file.name} substituído com sucesso!`);
        setFiles(prev => prev.filter(f => f.name !== duplicateConfirmation.file.name));
      } else {
        toast.error(result.error || 'Erro ao substituir arquivo');
      }
    } catch (error: any) {
      toast.error(`Erro ao substituir arquivo: ${error.message}`);
    } finally {
      setDuplicateConfirmation(null);
      setIsUploading(false);
    }
  };

  const handleCancelReplace = () => {
    setDuplicateConfirmation(null);
    toast.info('Substituição cancelada');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importação de NFE</h1>
        <p className="mt-2 text-gray-600">
          Faça o upload dos arquivos XML das notas fiscais para importação.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200 ease-in-out
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">
              {isDragActive
                ? 'Solte os arquivos aqui...'
                : 'Arraste e solte os arquivos XML aqui ou clique para selecionar'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Apenas arquivos XML são aceitos
            </p>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  Arquivos selecionados ({files.length})
                </h3>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-auto"
                >
                  {isUploading ? 'Enviando...' : 'Enviar Arquivos'}
                </Button>
              </div>

              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <span className="text-sm text-gray-700">{file.name}</span>
                          {file.info && (
                            <p className="text-xs text-gray-500">
                              NFE #{file.info.numero} - {file.info.emitente.nome}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.status === 'valid' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {file.status === 'invalid' && (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {file.info && <NFECard info={file.info} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmação de Duplicata */}
      {duplicateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                NFe Duplicada Detectada
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                {duplicateConfirmation.duplicateInfo.question}
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">NFe Existente:</h4>
                  <div className="text-sm text-red-700">
                    <p>Número: {duplicateConfirmation.duplicateInfo.existingNfe.numero}</p>
                    <p>Fornecedor: {duplicateConfirmation.duplicateInfo.existingNfe.fornecedor}</p>
                    <p>Valor: R$ {duplicateConfirmation.duplicateInfo.existingNfe.valor.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Nova NFe:</h4>
                  <div className="text-sm text-blue-700">
                    <p>Número: {duplicateConfirmation.duplicateInfo.newNfe.numero}</p>
                    <p>Fornecedor: {duplicateConfirmation.duplicateInfo.newNfe.fornecedor}</p>
                    <p>Valor: R$ {duplicateConfirmation.duplicateInfo.newNfe.valor.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleConfirmReplace}
                  disabled={isUploading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {duplicateConfirmation.duplicateInfo.options.replace}
                </Button>
                <Button 
                  onClick={handleCancelReplace}
                  variant="outline"
                  disabled={isUploading}
                  className="flex-1"
                >
                  {duplicateConfirmation.duplicateInfo.options.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Importacao;