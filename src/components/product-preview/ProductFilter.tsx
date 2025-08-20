import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from '../../types/nfe';

interface ProductFilterProps {
  onFilterChange: (filters: ProductFilters) => void;
  products: Product[];
}

export interface ProductFilters {
  searchTerm: string;
  showOnlyWithImages: boolean;
}

export const ProductFilter: React.FC<ProductFilterProps> = ({ onFilterChange, products }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showOnlyWithImages, setShowOnlyWithImages] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seleciona todo o texto 3 segundos após o valor mudar
  useEffect(() => {
    if (!inputRef.current) return;
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Efeito para aplicar o filtro automaticamente quando o usuário digita
  useEffect(() => {
    onFilterChange({
      searchTerm,
      showOnlyWithImages
    });
  }, [searchTerm, showOnlyWithImages, onFilterChange]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setShowOnlyWithImages(false);
    
    onFilterChange({
      searchTerm: '',
      showOnlyWithImages: false
    });
  };

  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="search-term" className="mb-1 block text-sm">Buscar em todas as colunas</Label>
            <div className="flex gap-2">
              <Input
                id="search-term"
                ref={inputRef}
                placeholder="Digite para buscar em qualquer coluna (código, descrição, EAN, referência, marca, descrição complementar)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {/* Removido filtro de produtos com imagem e botão Limpar Filtros */}
        </div>
      </div>
    </div>
  );
};