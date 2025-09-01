import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import { Download, FileText, FileSpreadsheet, File, Trash2, RefreshCw } from 'lucide-react';

interface ExportFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
  type: 'csv' | 'xlsx' | 'pdf';
}

interface ExportResult {
  success: boolean;
  filename?: string;
  recordCount?: number;
  error?: string;
}

const ExportManager: React.FC = () => {
  const [files, setFiles] = useState<ExportFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/export/files');
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
      } else {
        toast.error('Erro ao carregar arquivos de exportação');
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor');
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(format);
    
    try {
      const response = await fetch(`/api/export/nfes/${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result: ExportResult = await response.json();
      
      if (result.success) {
        toast.success(`Exportação ${format.toUpperCase()} criada com sucesso!`, {
          description: `${result.recordCount} registros exportados em ${result.filename}`
        });
        fetchFiles(); // Atualizar lista de arquivos
      } else {
        toast.error(`Erro na exportação ${format.toUpperCase()}`, {
          description: result.error
        });
      }
    } catch (error) {
      toast.error('Erro ao exportar dados', {
        description: 'Verifique a conexão com o servidor'
      });
    } finally {
      setExporting(null);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/export/download/${filename}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Download iniciado!');
      } else {
        toast.error('Erro ao fazer download do arquivo');
      }
    } catch (error) {
      toast.error('Erro ao fazer download', {
        description: 'Verifique a conexão com o servidor'
      });
    }
  };

  const handleCleanup = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/export/cleanup?days=7', {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.deletedFiles} arquivos antigos removidos`);
        fetchFiles();
      } else {
        toast.error('Erro ao limpar arquivos antigos');
      }
    } catch (error) {
      toast.error('Erro ao limpar arquivos');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return <FileText className="h-4 w-4" />;
      case 'xlsx':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <File className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'csv':
        return 'bg-green-100 text-green-800';
      case 'xlsx':
        return 'bg-blue-100 text-blue-800';
      case 'pdf':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exportação de Dados</h1>
          <p className="text-muted-foreground">
            Exporte suas NFEs em diferentes formatos para análise externa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchFiles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={handleCleanup}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* Seção de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Exportação</CardTitle>
          <CardDescription>
            Selecione o formato desejado para exportar todas as NFEs do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <FileText className="h-6 w-6" />
              <span>Exportar CSV</span>
              {exporting === 'csv' && (
                <div className="text-xs text-muted-foreground">Exportando...</div>
              )}
            </Button>
            
            <Button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <FileSpreadsheet className="h-6 w-6" />
              <span>Exportar Excel</span>
              {exporting === 'excel' && (
                <div className="text-xs text-muted-foreground">Exportando...</div>
              )}
            </Button>
            
            <Button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="h-20 flex-col gap-2"
              variant="outline"
            >
              <File className="h-6 w-6" />
              <span>Exportar PDF</span>
              {exporting === 'pdf' && (
                <div className="text-xs text-muted-foreground">Exportando...</div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Arquivos */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos de Exportação</CardTitle>
          <CardDescription>
            Histórico de exportações realizadas - arquivos são mantidos por 7 dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum arquivo de exportação encontrado</p>
              <p className="text-sm">Crie sua primeira exportação usando os botões acima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {files.map((file, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div>
                        <div className="font-medium">{file.filename}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • Criado em {formatDate(file.created)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={getTypeBadgeColor(file.type)}
                      >
                        {file.type.toUpperCase()}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(file.filename)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  {index < files.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportManager;