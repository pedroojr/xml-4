import React, { useEffect } from 'react';
import { TableCell, TableRow } from "@/components/ui/table"; // Corrected import path
import { Input } from "@/components/ui/input"; // Corrected import path
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { Product } from '../../types/nfe';
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
    // Calcula o preço de venda total sem arredondamento
    const basePrice = calculateSalePrice(product, globalMarkup);
    // Aplica o arredondamento
    const roundedPrice = roundPrice(basePrice, roundingType);

    if (roundedPrice !== product.salePrice) {
      onUpdate(index, 'salePrice', roundedPrice);
    }
  }, [globalMarkup, roundingType, product.netPrice]);

  // Calcula valores unitários
  const unitNetPrice = product.quantity > 0 ? product.netPrice / product.quantity : 0;
  
  // Calcula o preço de venda unitário considerando markup e arredondamento
  const baseUnitSalePrice =
    product.quantity > 0
      ? calculateSalePrice({ ...product, netPrice: unitNetPrice }, globalMarkup)
      : 0;
  const unitSalePrice = roundPrice(baseUnitSalePrice, roundingType);

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>{product.code || '-'}</TableCell>
      <TableCell>{product.ean || '-'}</TableCell>
      <TableCell>
        {editable ? (
          <Input
            value={product.name}
            onChange={(e) => onUpdate(index, 'name', e.target.value)}
            className="w-full border-blue-200 focus:border-blue-400"
          />
        ) : (
          product.name
        )}
      </TableCell>
      <TableCell>{product.ncm || '-'}</TableCell>
      <TableCell>{product.cfop || '-'}</TableCell>
      <TableCell>{product.uom || '-'}</TableCell>
      <TableCell className="text-right">{formatNumber(product.quantity)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.totalPrice)}</TableCell>
      <TableCell className="text-right">{formatCurrency(unitSalePrice)}</TableCell>
      <TableCell className="text-right">{formatCurrency(product.discount)}</TableCell>
      <TableCell className="text-right">{formatCurrency(unitNetPrice)}</TableCell>
      <TableCell className="text-right">
        {formatCurrency(calculateCustoLiquido(product, product.valorICMS))}
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
