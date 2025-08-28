import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard, copyNumberToClipboard } from '@/utils/clipboard';
import { formatCurrency, formatNumber } from '@/utils/formatters';

interface CopiavelProps {
  valor: string | number;
  formatacao?: 'texto' | 'moeda' | 'numero';
  className?: string;
}

export function Copiavel({ valor, formatacao = 'texto', className = "" }: CopiavelProps) {
  const [copiado, setCopiado] = useState(false);

  const getValorFormatado = () => {
    if (typeof valor === 'number') {
      if (formatacao === 'moeda') return formatCurrency(valor);
      if (formatacao === 'numero') return formatNumber(valor);
    }
    return String(valor);
  };

  const copiar = async () => {
    try {
      let sucesso;
      
      if (typeof valor === 'number') {
        sucesso = await copyNumberToClipboard(valor);
      } else {
        sucesso = await copyToClipboard(String(valor));
      }

      if (sucesso) {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1200);
      }
    } catch (error) {
      console.error("Erro ao copiar:", error);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-1 cursor-pointer select-none",
        "hover:bg-slate-50 px-1 py-0.5 rounded transition-colors",
        className
      )}
      onClick={copiar}
      title="Clique para copiar"
    >
      <span className="text-sm text-gray-800">{getValorFormatado()}</span>
      <span className={cn(
        "transition-all duration-200",
        copiado ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        {copiado ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400" />
        )}
      </span>
    </div>
  );
} 