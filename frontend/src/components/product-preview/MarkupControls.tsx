import React from 'react';
import { RoundingType } from './productCalculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface MarkupControlsProps {
  xapuriMarkup: number;
  epitaMarkup: number;
  impostoEntrada: number;
  roundingType: RoundingType;
  onXapuriMarkupChange: (value: number) => void;
  onEpitaMarkupChange: (value: number) => void;
  onImpostoEntradaChange: (value: number) => void;
  onRoundingChange: (value: RoundingType) => void;
  xapuriSuggestedMarkup?: number;
  epitaSuggestedMarkup?: number;
  valorFrete: number;
  onValorFreteChange: (value: number) => void;
}

export const MarkupControls: React.FC<MarkupControlsProps> = ({
  xapuriMarkup,
  epitaMarkup,
  impostoEntrada,
  roundingType,
  onXapuriMarkupChange,
  onEpitaMarkupChange,
  onImpostoEntradaChange,
  onRoundingChange,
  xapuriSuggestedMarkup,
  epitaSuggestedMarkup,
  valorFrete,
  onValorFreteChange,
}) => {
  return (
    <div className="p-2 border-b bg-white rounded shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="xapuri-markup" className="text-xs font-semibold text-blue-700 mb-1">
              Markup Xapuri (%)
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[220px] text-sm">
                    Markup sugerido para Xapuri
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Input
              id="xapuri-markup"
              type="number"
              value={xapuriMarkup}
              onChange={(e) => onXapuriMarkupChange(Number(e.target.value))}
              className="w-full min-w-[80px] border-blue-200 focus:border-blue-400 pr-16 px-2 py-1 rounded text-sm"
              step="5"
              placeholder="Ex: 120"
            />
            {xapuriSuggestedMarkup && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 cursor-pointer select-none" onClick={() => onXapuriMarkupChange(xapuriSuggestedMarkup)}>
                Sug: {xapuriSuggestedMarkup}%
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="epita-markup" className="text-xs font-semibold text-green-700 mb-1">
              Markup Epitaciolândia (%)
            </Label>
          </div>
          <div className="relative">
            <Input
              id="epita-markup"
              type="number"
              value={epitaMarkup}
              onChange={(e) => onEpitaMarkupChange(Number(e.target.value))}
              className="w-full min-w-[80px] border-emerald-200 focus:border-emerald-400 pr-16 px-2 py-1 rounded text-sm"
              step="5"
              placeholder="Ex: 130"
            />
            {epitaSuggestedMarkup && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-600 cursor-pointer select-none" onClick={() => onEpitaMarkupChange(epitaSuggestedMarkup)}>
                Sug: {epitaSuggestedMarkup}%
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="imposto-entrada" className="text-xs font-semibold text-amber-800 mb-1">
              Imposto de Entrada (%)
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[220px] text-sm">
                    Imposto sobre o custo líquido
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative">
            <Input
              id="imposto-entrada"
              type="number"
              value={impostoEntrada}
              onChange={(e) => onImpostoEntradaChange(Number(e.target.value))}
              className="w-full min-w-[80px] border-amber-200 focus:border-amber-400 px-2 py-1 rounded text-sm"
              min="0"
              max="100"
              step="0.5"
              placeholder="Ex: 12"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-amber-600">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold mb-1">Arredondamento</Label>
          <div className="flex gap-1">
            <button
              type="button"
              aria-pressed={roundingType === '90'}
              className={`h-8 px-2 text-xs rounded border font-medium transition min-w-[60px] focus:outline-none focus:ring-2 focus:ring-blue-400 ${roundingType === '90' ? 'bg-blue-600 text-white border-blue-700 shadow' : 'border-gray-300 bg-white text-gray-800'}`}
              onClick={() => onRoundingChange(roundingType === '90' ? 'none' : '90')}
            >
              R$ 0,90
            </button>
            <button
              type="button"
              aria-pressed={roundingType === '50'}
              className={`h-8 px-2 text-xs rounded border font-medium transition min-w-[60px] focus:outline-none focus:ring-2 focus:ring-blue-400 ${roundingType === '50' ? 'bg-blue-600 text-white border-blue-700 shadow' : 'border-gray-300 bg-white text-gray-800'}`}
              onClick={() => onRoundingChange(roundingType === '50' ? 'none' : '50')}
            >
              R$ 0,50
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor-frete" className="text-xs font-semibold text-indigo-700 mb-1">
            Frete Total (R$)
          </Label>
          <Input
            id="valor-frete"
            type="number"
            value={valorFrete}
            onChange={e => onValorFreteChange(Number(e.target.value))}
            className="w-full min-w-[80px] border-indigo-200 focus:border-indigo-400 px-2 py-1 rounded text-sm"
            min="0"
            step="0.01"
            placeholder="Ex: 100,00"
          />
        </div>
      </div>
    </div>
  );
};
