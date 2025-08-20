import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Note {
  id: string;
  number: string;
  emissionDate: string;
  supplier: string;
  totalValue: number;
}

interface PreviousNotesProps {
  notes: Note[];
  onViewNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  className?: string;
}

export const PreviousNotes: React.FC<PreviousNotesProps> = ({
  notes,
  onViewNote,
  onDeleteNote,
  className
}) => {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Notas Importadas Anteriormente
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <FileText className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-sm text-slate-600">
                Nenhuma nota fiscal foi importada ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900 truncate">
                          NF-e {note.number}
                        </p>
                        <p className="text-sm text-slate-500">
                          {note.supplier} • {format(new Date(note.emissionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewNote(note.id)}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="sr-only">Visualizar nota</span>
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Excluir nota</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}; 