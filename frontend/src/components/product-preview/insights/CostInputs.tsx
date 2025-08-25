
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '../../../utils/formatters';

interface CostInputsProps {
  monthlyFixedCosts: number;
  taxRate: number;
  freightCostPercentage: number;
  onMonthlyCostsChange: (value: number) => void;
  onTaxRateChange: (value: number) => void;
  onFreightCostChange: (value: number) => void;
  totalProductCost: number;
}

export const CostInputs: React.FC<CostInputsProps> = ({
  monthlyFixedCosts,
  taxRate,
  freightCostPercentage,
  onMonthlyCostsChange,
  onTaxRateChange,
  onFreightCostChange,
  totalProductCost
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Inserir Custos Adicionais</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="monthly-fixed-costs" className="text-sm font-medium">
              Custos Fixos Mensais (R$)
            </Label>
            <Input
              id="monthly-fixed-costs"
              type="number"
              value={monthlyFixedCosts}
              onChange={(e) => onMonthlyCostsChange(Number(e.target.value))}
              className="w-full"
              placeholder="Ex: 10000"
            />
            <p className="text-xs text-muted-foreground">
              Aluguel, salários, contas, etc.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tax-rate" className="text-sm font-medium">
              Taxa de Impostos (%)
            </Label>
            <Input
              id="tax-rate"
              type="number"
              value={taxRate}
              onChange={(e) => onTaxRateChange(Number(e.target.value))}
              className="w-full"
              placeholder="Ex: 9.25"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              ICMS, PIS/COFINS, etc.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="freight-cost" className="text-sm font-medium">
              Frete (% sobre custo)
            </Label>
            <Input
              id="freight-cost"
              type="number"
              value={freightCostPercentage}
              onChange={(e) => onFreightCostChange(Number(e.target.value))}
              className="w-full"
              placeholder="Ex: 5"
              step="0.5"
            />
            <p className="text-xs text-muted-foreground">
              Custo total de frete: {formatCurrency(totalProductCost * (freightCostPercentage / 100))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
