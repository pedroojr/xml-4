import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar, Package2, Building2 } from "lucide-react";
import { formatDate } from '@/utils/formatters';

interface NFE {
  id: string;
  number: string;
  supplier: string;
  issueDate: string;
  itemsQuantity: number;
}

interface SavedNFEListProps {
  nfes: NFE[];
  onNFESelect: (nfeId: string) => void;
}

const SavedNFEList: React.FC<SavedNFEListProps> = ({ nfes, onNFESelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  // Agrupar NFEs por fornecedor
  const nfesBySupplier = nfes.reduce((acc, nfe) => {
    if (!acc[nfe.supplier]) {
      acc[nfe.supplier] = [];
    }
    acc[nfe.supplier].push(nfe);
    return acc;
  }, {} as Record<string, NFE[]>);

  // Filtrar NFEs
  const filteredNFEs = Object.entries(nfesBySupplier)
    .filter(([supplier, nfeList]) => {
      const matchesSupplier = !selectedSupplier || supplier === selectedSupplier;
      const matchesSearch = !searchTerm ||
        supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nfeList.some(nfe =>
          nfe.number.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchesSupplier && matchesSearch;
    });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Notas Fiscais Salvas</CardTitle>
        <CardDescription>
          Gerencie suas notas fiscais importadas
        </CardDescription>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {selectedSupplier && (
            <Button
              variant="outline"
              onClick={() => setSelectedSupplier(null)}
            >
              Limpar Filtro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {filteredNFEs.map(([supplier, nfeList]) => (
            <AccordionItem key={supplier} value={supplier}>
              <AccordionTrigger className="hover:bg-slate-50 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{supplier}</span>
                  <span className="text-muted-foreground text-sm">
                    ({nfeList.length} {nfeList.length === 1 ? 'nota' : 'notas'})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 p-2">
                  {nfeList
                    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
                    .map((nfe) => (
                      <div
                        key={nfe.id}
                        className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg cursor-pointer"
                        onClick={() => onNFESelect(nfe.id)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">NF-e {nfe.number}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {formatDate(new Date(nfe.issueDate))}
                              <Package2 className="h-3 w-3 ml-2" />
                              {nfe.itemsQuantity} {nfe.itemsQuantity === 1 ? 'item' : 'itens'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNFESelect(nfe.id);
                          }}
                        >
                          Visualizar
                        </Button>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SavedNFEList; 