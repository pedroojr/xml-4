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
    
    if (roundedPrice !== product.totalPrice) {
      onUpdate(index, 'totalPrice', roundedPrice);
    }
  }, [globalMarkup, roundingType, product.netPrice]);

  // Calcula valores unitários
  const unitNetPrice = product.quantity > 0 ? product.netPrice / product.quantity : 0;
  
  // Calcula o preço de venda unitário considerando markup e arredondamento
  const baseUnitSalePrice = product.quantity > 0 ? calculateSalePrice({ ...product, netPrice: unitNetPrice }, globalMarkup) : 0;
  const unitSalePrice = roundPrice(baseUnitSalePrice, roundingType);

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>{product.code || '-'}</TableCell>
      <TableCell>{product.ean || '-'}</TableCell>
      <TableCell>
        {editable ? (
          <Input
            value={product.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className="w-full border-blue-200 focus:border-blue-400"
          />
        ) : (
          product.description
        )}
      </TableCell>
      <TableCell>{product.ncm || '-'}</TableCell>
      <TableCell>{product.cfop || '-'}</TableCell>
      <TableCell>{product.unit || '-'}</TableCell>
      <TableCell className="text-right">{formatNumber(product.quantity)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.totalPrice)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.discount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(unitNetPrice)}</TableCell>
      <TableCell className="text-right">
        {formatCurrency(calculateCustoLiquido(product, product.icmsValue))}
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
