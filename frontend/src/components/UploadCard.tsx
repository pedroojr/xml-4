import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  className?: string;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  onFileSelect,
  isProcessing = false,
  className
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const xmlFile = files.find(file => file.name.toLowerCase().endsWith('.xml'));
    
    if (xmlFile) {
      onFileSelect(xmlFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const xmlFile = files.find(file => file.name.toLowerCase().endsWith('.xml'));
    
    if (xmlFile) {
      onFileSelect(xmlFile);
    }
  };

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-50",
          isProcessing && "opacity-50"
        )}
      />
      
      <CardContent
        className="p-8 flex flex-col items-center justify-center min-h-[300px] relative"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <h3 className="text-lg font-medium text-slate-900 mb-2 text-center">
          Arraste ou selecione um arquivo XML da NF-e
        </h3>
        
        <p className="text-sm text-slate-600 mb-6 text-center">
          Aceitamos arquivos .XML da Nota Fiscal Eletrônica (NF-e)
        </p>

        <div className="flex gap-4">
          <Button
            size="lg"
            className="relative"
            disabled={isProcessing}
          >
            <input
              type="file"
              accept=".xml"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <FileUp className="mr-2 h-5 w-5" />
            Selecionar Arquivo XML
          </Button>
        </div>

        {isProcessing && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="text-sm text-slate-600">Processando arquivo...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 