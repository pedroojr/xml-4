
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product } from '../../types/nfe';
import { CostInputs } from './insights/CostInputs';
import { PricingAnalysis } from './insights/PricingAnalysis';
import { ProfitabilityAnalysis } from './insights/ProfitabilityAnalysis';
import { PriceCharts } from './insights/PriceCharts';

interface ProductAnalysisTabsProps {
  products: Product[];
  xapuriMarkup: number;
  epitaMarkup: number;
}

export const ProductAnalysisTabs: React.FC<ProductAnalysisTabsProps> = ({
  products,
  xapuriMarkup,
  epitaMarkup
}) => {
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState<number>(10000);
  const [taxRate, setTaxRate] = useState<number>(9.25);
  const [freightCostPercentage, setFreightCostPercentage] = useState<number>(5);
  
  const totalProductCost = products.reduce((sum, product) => sum + product.netPrice, 0);

  return (
    <Tabs defaultValue="pricing" className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="pricing">Precificação Estratégica</TabsTrigger>
        <TabsTrigger value="profitability">Análise de Lucratividade</TabsTrigger>
        <TabsTrigger value="charts">Gráficos</TabsTrigger>
      </TabsList>
      
      <TabsContent value="pricing">
        <CostInputs
          monthlyFixedCosts={monthlyFixedCosts}
          taxRate={taxRate}
          freightCostPercentage={freightCostPercentage}
          onMonthlyCostsChange={setMonthlyFixedCosts}
          onTaxRateChange={setTaxRate}
          onFreightCostChange={setFreightCostPercentage}
          totalProductCost={totalProductCost}
        />
        <PricingAnalysis 
          products={products}
          xapuriMarkup={xapuriMarkup}
          epitaMarkup={epitaMarkup}
          monthlyFixedCosts={monthlyFixedCosts}
          taxRate={taxRate}
          freightCostPercentage={freightCostPercentage}
        />
      </TabsContent>
      
      <TabsContent value="profitability">
        <CostInputs
          monthlyFixedCosts={monthlyFixedCosts}
          taxRate={taxRate}
          freightCostPercentage={freightCostPercentage}
          onMonthlyCostsChange={setMonthlyFixedCosts}
          onTaxRateChange={setTaxRate}
          onFreightCostChange={setFreightCostPercentage}
          totalProductCost={totalProductCost}
        />
        <ProfitabilityAnalysis 
          products={products}
          xapuriMarkup={xapuriMarkup}
          epitaMarkup={epitaMarkup}
          taxRate={taxRate}
          freightCostPercentage={freightCostPercentage}
          monthlyFixedCosts={monthlyFixedCosts}
        />
      </TabsContent>
      
      <TabsContent value="charts">
        <PriceCharts 
          products={products}
          xapuriMarkup={xapuriMarkup}
          epitaMarkup={epitaMarkup}
        />
      </TabsContent>
    </Tabs>
  );
};
