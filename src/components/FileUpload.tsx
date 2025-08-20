
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  acceptedFileTypes?: string[];
  fileTypeDescription?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept = { 'text/xml': ['.xml'] },
  acceptedFileTypes = ['.xml'],
  fileTypeDescription = 'Suporta apenas arquivos XML de NF-e'
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Verificar se a extensão do arquivo está na lista de extensões aceitas
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isAcceptedExtension = acceptedFileTypes.includes(fileExtension);
      
      if (!isAcceptedExtension) {
        toast.error(`Por favor, selecione um arquivo válido: ${acceptedFileTypes.join(', ')}`);
        return;
      }
      
      onFileSelect(file);
      toast.success(`Arquivo "${file.name}" selecionado com sucesso`);
    }
  }, [onFileSelect, acceptedFileTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <input {...getInputProps()} />
      <div className="max-w-[200px] mx-auto space-y-4">
        {isDragActive ? (
          <>
            <Upload className="h-12 w-12 text-blue-500 mx-auto" />
            <p className="text-lg text-blue-700">Solte o arquivo aqui</p>
          </>
        ) : (
          <>
            <FileText className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg text-gray-700 mb-2">
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-sm text-gray-500">
                {fileTypeDescription}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
