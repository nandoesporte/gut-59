
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FoodForm } from "./FoodForm";
import type { ProtocolFood } from "@/components/menu/types";

export const FoodPreferencesTab = () => {
  const [foods, setFoods] = useState<ProtocolFood[]>([]);
  const [foodGroups, setFoodGroups] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFood, setSelectedFood] = useState<ProtocolFood | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchFoods();
    fetchFoodGroups();
  }, []);

  const fetchFoods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setFoods(data || []);
    } catch (error) {
      console.error('Error fetching foods:', error);
      toast.error('Erro ao carregar alimentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchFoodGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('food_groups')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      setFoodGroups(data || []);
    } catch (error) {
      console.error('Error fetching food groups:', error);
      toast.error('Erro ao carregar grupos de alimentos');
    }
  };

  const handleEdit = (food: ProtocolFood) => {
    setSelectedFood(food);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este alimento?')) {
      return;
    }

    setIsDeleting(true);
    setDeleteId(id);

    try {
      const { error } = await supabase
        .from('protocol_foods')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      setFoods(foods.filter(food => food.id !== id));
      toast.success('Alimento removido com sucesso');
    } catch (error) {
      console.error('Error deleting food:', error);
      toast.error('Erro ao remover alimento');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleAddNew = () => {
    setSelectedFood(null);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = () => {
    setIsDialogOpen(false);
    fetchFoods();
  };

  const filteredFoods = foods.filter(food => 
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Gerenciar Alimentos</h2>
          <Button onClick={handleAddNew} className="flex items-center gap-2">
            <Plus size={16} />
            Adicionar Alimento
          </Button>
        </div>

        <div className="mb-4">
          <Input
            placeholder="Buscar alimentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Nenhum alimento encontrado para sua busca' : 'Nenhum alimento cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Calorias</TableHead>
                  <TableHead>Proteínas (g)</TableHead>
                  <TableHead>Carboidratos (g)</TableHead>
                  <TableHead>Gorduras (g)</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFoods.map((food) => {
                  const foodGroup = foodGroups.find(group => group.id === food.food_group_id);
                  return (
                    <TableRow key={food.id}>
                      <TableCell className="font-medium">{food.name}</TableCell>
                      <TableCell>{food.calories}</TableCell>
                      <TableCell>{food.protein ?? '-'}</TableCell>
                      <TableCell>{food.carbs ?? '-'}</TableCell>
                      <TableCell>{food.fats ?? '-'}</TableCell>
                      <TableCell>{foodGroup?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEdit(food)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDelete(food.id)}
                            disabled={isDeleting && deleteId === food.id}
                          >
                            {isDeleting && deleteId === food.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedFood ? 'Editar Alimento' : 'Adicionar Novo Alimento'}
            </DialogTitle>
          </DialogHeader>
          <FoodForm
            food={selectedFood}
            foodGroups={foodGroups}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
