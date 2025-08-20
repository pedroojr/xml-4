import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Image } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

export function getDefaultColumns(): ColumnDef<any>[] {
  return [
    // ... existing columns ...
    {
      id: "lucroEpitaComDesconto",
      header: "Lucro Epita c/ Desc.",
      accessorFn: (row) => {
        const custoLiquido = row.valor * (1 + (row.impostoEntrada || 0) / 100);
        const precoEpita = custoLiquido * (row.epitaMarkup || 130) / 100;
        const precoComDesconto = precoEpita * 0.9; // 10% de desconto
        const lucro = precoComDesconto - custoLiquido;
        return lucro;
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