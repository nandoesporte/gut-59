
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModuleFormProps {
  onModuleChange: () => Promise<void>;
}

export const ModuleForm = ({ onModuleChange }: ModuleFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('training_modules')
        .insert({
          title,
          description,
          display_order: parseInt(displayOrder)
        });

      if (error) throw error;

      toast.success('Módulo criado com sucesso!');
      setTitle("");
      setDescription("");
      setDisplayOrder("");
      await onModuleChange();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao criar módulo');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="displayOrder">Ordem de exibição</Label>
        <Input
          id="displayOrder"
          type="number"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(e.target.value)}
          required
        />
      </div>
      <Button type="submit">Criar Módulo</Button>
    </form>
  );
};
