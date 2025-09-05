import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Image } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

export function getDefaultColumns(): ColumnDef<any>[] {
  return [
    // ... existing columns ...
    {
      id: "epitaProfitWithDiscount",
      header: "Lucro Epita c/ Desc.",
      accessorFn: (row) => {
        const netCost = row.value * (1 + (row.entryTax || 0) / 100);
        const epitaPrice = netCost * (row.epitaMarkup || 130) / 100;
        const priceWithDiscount = epitaPrice * 0.9; // 10% discount
        const profit = priceWithDiscount - netCost;
        return profit;
      },
      cell: ({ getValue }) => {
        const value = getValue() as number;
        const formattedValue = formatCurrency(value);
        return (
          <div className={`text-right ${value < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formattedValue}
          </div>
        );
      },
    },
    // ... rest of the columns ...
  ];
} 