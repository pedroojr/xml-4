import React, { useState, useEffect } from 'react';
import { Product } from '../../types/nfe';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Tag, Save } from "lucide-react";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductTagsProps {
  product: Product;
  index: number;
  onUpdate: (index: number, field: keyof Product, value: any) => void;
}

// Categorias predefinidas para sugestão automática
const CATEGORIAS_PREDEFINIDAS = [
  { id: 'calcados', nome: 'Calçados', keywords: ['sapato', 'tenis', 'sandalia', 'chinelo', 'bota'] },
  { id: 'roupas', nome: 'Roupas', keywords: ['camisa', 'camiseta', 'calca', 'bermuda', 'jaqueta', 'vestido', 'blusa'] },
  { id: 'acessorios', nome: 'Acessórios', keywords: ['bolsa', 'carteira', 'cinto', 'oculos', 'relogio', 'pulseira', 'colar'] },
  { id: 'infantil', nome: 'Infantil', keywords: ['infantil', 'crianca', 'bebe', 'kids', 'juvenil'] },
  { id: 'esportivo', nome: 'Esportivo', keywords: ['esporte', 'futebol', 'corrida', 'fitness', 'academia'] },
  { id: 'casual', nome: 'Casual', keywords: ['casual', 'dia a dia', 'basico'] },
  { id: 'social', nome: 'Social', keywords: ['social', 'festa', 'formal', 'elegante'] },
  { id: 'praia', nome: 'Praia', keywords: ['praia', 'banho', 'piscina', 'natacao', 'maiô', 'biquini'] },
  { id: 'inverno', nome: 'Inverno', keywords: ['inverno', 'frio', 'termico'] },
  { id: 'verao', nome: 'Verão', keywords: ['verao', 'calor'] },
];

export const ProductTags: React.FC<ProductTagsProps> = ({ product, index, onUpdate }) => {
  const [tags, setTags] = useState<string[]>(product.tags || []);
  const [newTag, setNewTag] = useState<string>('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Gerar sugestões de tags com base na descrição do produto
  useEffect(() => {
    if (product.name) {
      const descricaoLowerCase = product.name.toLowerCase();
      const sugestoes: string[] = [];
      
      CATEGORIAS_PREDEFINIDAS.forEach(categoria => {
        const matchesKeyword = categoria.keywords.some(keyword => 
          descricaoLowerCase.includes(keyword.toLowerCase())
        );
        
        if (matchesKeyword && !tags.includes(categoria.nome)) {
          sugestoes.push(categoria.nome);
        }
      });
      
      // Adicionar sugestões baseadas em características específicas
      if (product.color && !tags.includes(product.color)) {
        sugestoes.push(product.color);
      }
      
      if (product.size && !tags.includes(product.size)) {
        sugestoes.push(product.size);
      }
      
      if (product.brand && !tags.includes(product.brand)) {
        sugestoes.push(product.brand);
      }
      
      setSuggestedTags(sugestoes);
    }
  }, [product.name, product.color, product.size, product.brand, tags]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      onUpdate(index, 'tags', updatedTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    onUpdate(index, 'tags', updatedTags);
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      onUpdate(index, 'tags', updatedTags);
      
      // Remover da lista de sugestões
      setSuggestedTags(prev => prev.filter(t => t !== tag));
    }
  };

  const handleSaveTags = () => {
    onUpdate(index, 'tags', tags);
    setIsDialogOpen(false);
    toast.success('Tags salvas com sucesso!');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((tag, i) => (
          <Badge key={i} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button 
              onClick={() => handleRemoveTag(tag)}
              className="ml-1 h-3 w-3 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-slate-500"
            >
              <X className="h-2 w-2" />
            </button>
          </Badge>
        ))}
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Gerenciar Tags</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Tags</DialogTitle>
              <DialogDescription>
                Adicione ou remova tags para categorizar este produto.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="new-tag" className="text-sm">Nova Tag</Label>
                  <Input
                    id="new-tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Digite uma nova tag"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                </div>
                <Button onClick={handleAddTag} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {suggestedTags.length > 0 && (
                <div>
                  <Label className="text-sm mb-2 block">Sugestões de Tags</Label>
                  <div className="flex flex-wrap gap-1">
                    {suggestedTags.map((tag, i) => (
                      <Badge 
                        key={i} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-slate-100"
                        onClick={() => handleAddSuggestedTag(tag)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {tags.length > 0 && (
                <div>
                  <Label className="text-sm mb-2 block">Tags Atuais</Label>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button 
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 h-3 w-3 rounded-full bg-slate-400 text-white flex items-center justify-center hover:bg-slate-500"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={handleSaveTags}>
                <Save className="h-4 w-4 mr-1" />
                Salvar Tags
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};