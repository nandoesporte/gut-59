
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Professional, ProfessionalFormValues } from "@/components/admin/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, Pencil, Trash2 } from "lucide-react";

export const ProfessionalsTab = () => {
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [currentPhotoFile, setCurrentPhotoFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: professionals, isLoading } = useQuery({
    queryKey: ['admin-professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as Professional[];
    },
  });

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCurrentPhotoFile(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    try {
      let photoUrl = editingProfessional?.photo_url;

      if (currentPhotoFile) {
        const fileExt = currentPhotoFile.name.split('.').pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('professional-photos')
          .upload(filePath, currentPhotoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('professional-photos')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      const professionalData: ProfessionalFormValues = {
        name: formData.get('name') as string,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        display_order: parseInt(formData.get('display_order') as string),
        status: formData.get('status') as 'active' | 'inactive',
        photo_url: photoUrl,
      };

      if (editingProfessional) {
        const { error } = await supabase
          .from('professionals')
          .update(professionalData)
          .eq('id', editingProfessional.id);

        if (error) throw error;
        toast.success('Profissional atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('professionals')
          .insert(professionalData);

        if (error) throw error;
        toast.success('Profissional adicionado com sucesso');
      }

      setEditingProfessional(null);
      setCurrentPhotoFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-professionals'] });
      form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar profissional');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Profissional removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-professionals'] });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao remover profissional');
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingProfessional ? 'Editar Profissional' : 'Adicionar Novo Profissional'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingProfessional?.name}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={editingProfessional?.title}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingProfessional?.description || ''}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  name="display_order"
                  type="number"
                  required
                  defaultValue={editingProfessional?.display_order || 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  defaultValue={editingProfessional?.status || 'active'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Foto</Label>
              <Input
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingProfessional ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingProfessional && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProfessional(null)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals?.map((professional) => (
          <Card key={professional.id}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={professional.photo_url || ''} alt={professional.name} />
                  <AvatarFallback>
                    <UserRound className="w-8 h-8 text-gray-400" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold">{professional.name}</h4>
                  <p className="text-sm text-gray-600">{professional.title}</p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingProfessional(professional)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(professional.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
