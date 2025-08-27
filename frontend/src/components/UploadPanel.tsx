import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from './FileUpload';
import FileUploadPDF from './FileUploadPDF';

interface UploadPanelProps {
  onFileSelect: (file: File) => void;
  onTabChange?: (tab: string) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onFileSelect, onTabChange }) => {
  const [currentTab, setCurrentTab] = useState('upload');

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };
  const [pdfItems, setPdfItems] = useState<
    {
      item: string;
      descricao: string;
      quantidade: number;
      totalBruto: number;
      totalLiquido: number;
    }[]
  >([]);

  return (
    <Tabs
      defaultValue="upload"
      value={currentTab}
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="upload">Upload de XML</TabsTrigger>
        <TabsTrigger value="pdf">Upload de PDF</TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <FileUpload onFileSelect={onFileSelect} />
      </TabsContent>

      <TabsContent value="pdf">
        <FileUploadPDF onItemsExtracted={setPdfItems} />
        {pdfItems.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4 text-center">
              Produtos extraídos do PDF
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border">Item</th>
                    <th className="px-4 py-2 border">Descrição</th>
                    <th className="px-4 py-2 border">Quantidade</th>
                    <th className="px-4 py-2 border">Total Bruto</th>
                    <th className="px-4 py-2 border">Total Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 border">{item.item}</td>
                      <td className="px-4 py-2 border">{item.descricao}</td>
                      <td className="px-4 py-2 border">{item.quantidade}</td>
                      <td className="px-4 py-2 border">{item.totalBruto}</td>
                      <td className="px-4 py-2 border">{item.totalLiquido}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default UploadPanel;
