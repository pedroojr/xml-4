import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Product } from '../../types/nfe';
import { FileSpreadsheet, FileText, Download, FileJson, Database } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportOptionsProps {
  products: Product[];
  invoiceNumber: string;
  brandName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExportField {
  id: string;
  label: string;
  checked: boolean;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({ 
  products, 
  invoiceNumber,
  brandName,
  isOpen,
  onClose 
}) => {
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { id: 'code', label: 'Código', checked: true },
    { id: 'ean', label: 'EAN', checked: true },
    { id: 'name', label: 'Descrição', checked: true },
    { id: 'ncm', label: 'NCM', checked: true },
    { id: 'cfop', label: 'CFOP', checked: true },
    { id: 'unidade', label: 'Unidade', checked: true },
    { id: 'quantidade', label: 'Quantidade', checked: true },
    { id: 'valorUnitario', label: 'Preço Unitário', checked: true },
    { id: 'valorTotal', label: 'Preço Total', checked: true },
    { id: 'discount', label: 'Desconto', checked: true },
    { id: 'netPrice', label: 'Preço Líquido', checked: true },
    { id: 'color', label: 'Cor', checked: true },
    { id: 'size', label: 'Tamanho', checked: true },
    { id: 'reference', label: 'Referência', checked: true },
    { id: 'brand', label: 'Marca', checked: true },
    { id: 'salePrice', label: 'Preço de Venda', checked: true },
    { id: 'tags', label: 'Tags', checked: true },
  ]);

  const toggleField = (id: string) => {
    setExportFields(fields => 
      fields.map(field => 
        field.id === id ? { ...field, checked: !field.checked } : field
      )
    );
  };

  const selectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, checked: true }))
    );
  };

  const deselectAllFields = () => {
    setExportFields(fields => 
      fields.map(field => ({ ...field, checked: false }))
    );
  };

  const getSelectedFields = () => {
    return exportFields.filter(field => field.checked).map(field => field.id);
  };

  const getFileName = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    const brand = brandName.replace(/\s+/g, '_').toLowerCase();
    const invoice = invoiceNumber ? `_nf${invoiceNumber}` : '';
    return `produtos_${brand}${invoice}_${date}.${extension}`;
  };

  const exportToCSV = () => {
    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar');
      return;
    }

    const headers = exportFields
      .filter(field => field.checked)
      .map(field => field.label);

    const rows = products.map(product => 
      selectedFields.map(field => {
        if (field === 'tags' && Array.isArray(product.tags)) {
          return product.tags.join(', ');
        }
        return product[field as keyof Product];
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getFileName('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Produtos exportados para CSV com sucesso!');
  };

  const exportToExcel = () => {
    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar');
      return;
    }

    // Criar um CSV que o Excel pode abrir
    const headers = exportFields
      .filter(field => field.checked)
      .map(field => field.label);

    const rows = products.map(product => 
      selectedFields.map(field => {
        if (field === 'tags' && Array.isArray(product.tags)) {
          return product.tags.join(', ');
        }
        // Formatar números com ponto decimal para vírgula para Excel BR
        if (typeof product[field as keyof Product] === 'number') {
          return String(product[field as keyof Product]).replace('.', ',');
        }
        return product[field as keyof Product];
      })
    );

    const csvContent = [
      headers.join(';'),  // Excel BR usa ponto-e-vírgula como separador
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM para Excel reconhecer UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getFileName('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Produtos exportados para Excel com sucesso!');
  };

  const exportToJSON = () => {
    const selectedFields = getSelectedFields();
    if (selectedFields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar');
      return;
    }

    const filteredProducts = products.map(product => {
      const filteredProduct: Record<string, any> = {};
      selectedFields.forEach(field => {
        filteredProduct[field] = product[field as keyof Product];
      });
      return filteredProduct;
    });

    const jsonContent = JSON.stringify(filteredProducts, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getFileName('json'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Produtos exportados para JSON com sucesso!');
  };

  const exportToDataSystemFormat = () => {
    // Formato específico para importação no DataSystem
    const dataSystemRows = products.map(product => ({
      codigo: product.code,
      ean: product.ean,
      descricao: product.name,
      ncm: product.ncm,
      preco_custo: product.netPrice,
      preco_venda: product.salePrice,
      estoque: product.quantity,
      unidade: product.uom,
      marca: product.brand || brandName,
      referencia: product.reference || '',
      cor: product.color || '',
      tamanho: product.size || '',
    }));

    const jsonContent = JSON.stringify(dataSystemRows, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `datasystem_import_${invoiceNumber || 'produtos'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Produtos exportados no formato DataSystem com sucesso!');
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={exportToCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar para CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToExcel}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar para Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            Exportar para JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToDataSystemFormat}>
            <Database className="h-4 w-4 mr-2" />
            Exportar para DataSystem
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}