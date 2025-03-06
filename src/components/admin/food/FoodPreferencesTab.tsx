
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FoodForm } from "./FoodForm";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";
import type { ProtocolFood } from "@/components/admin/types";

export const FoodPreferencesTab = () => {
  const [foods, setFoods] = useState<ProtocolFood[]>([]);
  const [foodGroups, setFoodGroups] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentFood, setCurrentFood] = useState<ProtocolFood | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchFoods();
    fetchFoodGroups();
  }, []);

  const fetchFoods = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      // First cast to unknown, then to ProtocolFood[] to satisfy TypeScript
      setFoods((data as unknown) as ProtocolFood[] || []);
    } catch (error) {
      console.error('Error fetching foods:', error);
      toast.error('Erro ao carregar alimentos');
    } finally {
      setIsLoading(false);
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

  const handleEditFood = (food: ProtocolFood) => {
    setCurrentFood(food);
    setIsFormOpen(true);
  };

  const handleDeleteFood = async () => {
    if (!currentFood) return;

    try {
      const { error } = await supabase
        .from('protocol_foods')
        .delete()
        .eq('id', currentFood.id);

      if (error) {
        throw error;
      }

      toast.success('Alimento excluído com sucesso');
      fetchFoods();
      setIsDeleteDialogOpen(false);
      setCurrentFood(null);
    } catch (error) {
      console.error('Error deleting food:', error);
      toast.error('Erro ao excluir alimento');
    }
  };

  const confirmDelete = (food: ProtocolFood) => {
    setCurrentFood(food);
    setIsDeleteDialogOpen(true);
  };

  const handleFormSubmit = async () => {
    setIsFormOpen(false);
    fetchFoods();
  };

  const filteredFoods = foods.filter(food => {
    const matchesSearch = searchTerm === "" || 
      food.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPhase = phaseFilter === null || 
      food.phase === parseInt(phaseFilter);

    return matchesSearch && matchesPhase;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gerenciamento de Alimentos</h2>
        <Button onClick={() => {
          setCurrentFood(null);
          setIsFormOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Alimento
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <Tabs defaultValue="all">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="all" onClick={() => setPhaseFilter(null)}>Todos</TabsTrigger>
              <TabsTrigger value="phase1" onClick={() => setPhaseFilter("1")}>Fase 1</TabsTrigger>
              <TabsTrigger value="phase2" onClick={() => setPhaseFilter("2")}>Fase 2</TabsTrigger>
              <TabsTrigger value="phase3" onClick={() => setPhaseFilter("3")}>Fase 3</TabsTrigger>
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar alimento..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            {renderFoodsTable(filteredFoods)}
          </TabsContent>
          <TabsContent value="phase1" className="mt-0">
            {renderFoodsTable(filteredFoods)}
          </TabsContent>
          <TabsContent value="phase2" className="mt-0">
            {renderFoodsTable(filteredFoods)}
          </TabsContent>
          <TabsContent value="phase3" className="mt-0">
            {renderFoodsTable(filteredFoods)}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentFood ? 'Editar Alimento' : 'Adicionar Alimento'}</DialogTitle>
          </DialogHeader>
          <FoodForm 
            food={currentFood} 
            foodGroups={foodGroups}
            onSubmit={handleFormSubmit} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir o alimento "{currentFood?.name}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteFood}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderFoodsTable(foodsList: ProtocolFood[]) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-500">Carregando alimentos...</span>
        </div>
      );
    }

    if (foodsList.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          {searchTerm || phaseFilter ? "Nenhum alimento encontrado para os filtros aplicados." : "Nenhum alimento cadastrado."}
        </div>
      );
    }

    return (
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fase</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Calorias</TableHead>
              <TableHead>Proteína</TableHead>
              <TableHead>Carb.</TableHead>
              <TableHead>Gordura</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {foodsList.map((food) => (
              <TableRow key={food.id}>
                <TableCell className="font-medium">{food.name}</TableCell>
                <TableCell>{food.phase || '-'}</TableCell>
                <TableCell>
                  {food.food_group_id 
                    ? foodGroups.find(g => g.id === food.food_group_id)?.name || '-' 
                    : '-'}
                </TableCell>
                <TableCell>{food.calories || '-'}</TableCell>
                <TableCell>{food.protein || '-'}</TableCell>
                <TableCell>{food.carbs || '-'}</TableCell>
                <TableCell>{food.fats || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditFood(food)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(food)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
};
