import React, { useEffect } from 'react';
import { TableCell, TableRow } from "@/components/ui/table"; // Corrected import path
import { Input } from "@/components/ui/input"; // Corrected import path
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Product } from '../../types/nfe';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Corrected import path
import { CORES_OPCOES } from '../../utils/colorParser';
import { calculateSalePrice, roundPrice, RoundingType, calculateCustoLiquido } from './productCalculations';
import { ProductTags } from './ProductTags';

interface ProductTableRowProps {
  product: Product;
  index: number;
  editable: boolean;
  onUpdate: (index: number, field: keyof Product, value: any) => void;
  units: string[];
  globalMarkup: number;
  roundingType: RoundingType;
}

export const ProductTableRow: React.FC<ProductTableRowProps> = ({
  product,
  index,
  editable,
  onUpdate,
  units,
  globalMarkup,
  roundingType
}) => {
  useEffect(() => {
    // Calculate base sale price without rounding
    const basePrice = calculateSalePrice(product, globalMarkup);
    // Apply rounding
    const roundedPrice = roundPrice(basePrice, roundingType);
    
    if (roundedPrice !== product.valorTotal) { // Changed to valorTotal
      onUpdate(index, 'valorTotal', roundedPrice); // Changed to valorTotal
    }
  }, [globalMarkup, roundingType, product.netPrice]);

  // Calcula valores unitários
  const unitNetPrice = product.quantidade > 0 ? product.netPrice / product.quantidade : 0;
  
  // Calcula o preço de venda unitário considerando markup e arredondamento
  const baseUnitSalePrice = product.quantidade > 0 ? calculateSalePrice({ ...product, netPrice: unitNetPrice }, globalMarkup) : 0;
  const unitSalePrice = roundPrice(baseUnitSalePrice, roundingType);

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>{product.codigo || '-'}</TableCell> {/* Changed to codigo */}
      <TableCell>{product.ean || '-'}</TableCell>
      <TableCell>
        {editable ? (
          <Input
            value={product.descricao} // Changed to descricao
            onChange={(e) => onUpdate(index, 'descricao', e.target.value)} // Changed to descricao
            className="w-full border-blue-200 focus:border-blue-400"
          />
        ) : (
          product.descricao // Changed to descricao
        )}
      </TableCell>
      <TableCell>{product.ncm || '-'}</TableCell>
      <TableCell>{product.cfop || '-'}</TableCell>
      <TableCell>{product.unidade || '-'}</TableCell> {/* Changed to unidade */}
      <TableCell className="text-right">{formatNumber(product.quantidade)}</TableCell> {/* Changed to quantidade */}
      <TableCell className="text-right">{formatCurrency(product.valorUnitario)}</TableCell> {/* Changed to valorUnitario */}
      <TableCell className="text-right">{formatCurrency(product.valorTotal)}</TableCell> {/* Changed to valorTotal */}
      <TableCell className="text-right">{formatCurrency(product.discount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(unitNetPrice)}</TableCell>
      <TableCell className="text-right">
        {formatCurrency(calculateCustoLiquido(product, product.valorICMS))} {/* Changed to valorICMS */}
      </TableCell>
      <TableCell>
        <ProductTags 
          product={product} 
          index={index} 
          onUpdate={onUpdate} 
        />
      </TableCell>
    </TableRow>
  );
};
