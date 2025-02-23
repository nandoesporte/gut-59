
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BatchUploadFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const BatchUploadForm = ({ onSuccess, onCancel }: BatchUploadFormProps) => {
  const [loading, setLoading] = useState(false);
  const [jsonData, setJsonData] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const exercises = JSON.parse(jsonData);
      
      if (!Array.isArray(exercises)) {
        throw new Error('Os dados devem ser um array de exercícios');
      }

      const { error } = await supabase
        .from('exercises')
        .insert(exercises);

      if (error) throw error;
      
      onSuccess();
      toast.success('Exercícios importados com sucesso!');
    } catch (error) {
      console.error('Error uploading exercises:', error);
      toast.error('Erro ao importar exercícios. Verifique o formato dos dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={jsonData}
        onChange={(e) => setJsonData(e.target.value)}
        placeholder="Cole aqui o JSON com os exercícios..."
        rows={10}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Importando...' : 'Importar'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};
