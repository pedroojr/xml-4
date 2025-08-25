
import React from 'react';
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface GlobalControlsProps {
  markup: number;
  roundingType: '90' | '50';
  onMarkupChange: (value: number) => void;
  onRoundingChange: (type: '90' | '50') => void;
}

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  markup,
  roundingType,
  onMarkupChange,
  onRoundingChange,
}) => {
  return (
    <Card className="p-6 bg-white shadow-sm border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Markup Global (%)</label>
            <Input
              type="number"
              value={markup}
              onChange={(e) => onMarkupChange(parseFloat(e.target.value) || 0)}
              className="w-28 border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Arredondamento</label>
            <div className="flex gap-2">
              <button
                onClick={() => onRoundingChange('90')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  roundingType === '90' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                .90
              </button>
              <button
                onClick={() => onRoundingChange('50')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  roundingType === '50' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                .50
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
