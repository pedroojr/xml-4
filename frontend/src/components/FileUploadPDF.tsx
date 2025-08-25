import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';

interface FileUploadPDFProps {
  onItemsExtracted: (items: any[]) => void;
}

const FileUploadPDF: React.FC<FileUploadPDFProps> = ({ onItemsExtracted }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pedido', file);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await axios.post(`${apiUrl}/importar-pedido`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data && data.itens) {
        onItemsExtracted(data.itens);
      } else {
        setError('Nenhum item encontrado no PDF.');
      }
    },
    onError: () => {
      setError('Erro ao enviar o PDF.');
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      await uploadMutation.mutateAsync(file);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-gray-300 hover:border-gray-400">
      <input
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        id="upload-pdf"
        onChange={handleFileChange}
        disabled={uploadMutation.isPending}
      />
      <label htmlFor="upload-pdf" className="block cursor-pointer">
        <FileText className="h-12 w-12 text-gray-400 mx-auto" />
        <p className="text-lg text-gray-700 mb-2">Arraste o arquivo aqui ou clique para selecionar</p>
        <p className="text-sm text-gray-500">Suporta apenas arquivos PDF de pedidos</p>
      </label>
      {selectedFile && (
        <div className="mt-4 text-gray-700">
          PDF selecionado: <b>{selectedFile.name}</b>
        </div>
      )}
      {uploadMutation.isPending && <div className="mt-4 text-blue-600">Enviando PDF...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
};

export default FileUploadPDF; 