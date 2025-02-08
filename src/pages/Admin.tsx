
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  age: number | null;
  health_conditions: string | null;
}

interface Symptom {
  id: string;
  user_id: string;
  created_at: string;
  discomfort_level: number | null;
  has_nausea: boolean;
  has_abdominal_pain: boolean;
  has_gas: boolean;
  has_bloating: boolean;
  notes: string | null;
}

interface Meal {
  id: string;
  user_id: string;
  meal_date: string;
  protocol_phase: number;
  meal_type: string;
  food_group: string;
  custom_food: string | null;
}

interface WaterIntake {
  id: string;
  user_id: string;
  created_at: string;
  amount_ml: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data, error } = await supabase.rpc('has_role', { role: 'admin' });
      
      if (error) {
        console.error('Error checking admin role:', error);
        toast.error('Erro ao verificar permissões');
        navigate('/');
        return;
      }

      setIsAdmin(data);
      if (!data) {
        toast.error('Acesso não autorizado');
        navigate('/');
      }
    };

    checkAdminRole();
  }, [navigate]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data as User[];
    },
  });

  const { data: symptoms, isLoading: symptomsLoading } = useQuery({
    queryKey: ['admin-symptoms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Symptom[];
    },
  });

  const { data: meals, isLoading: mealsLoading } = useQuery({
    queryKey: ['admin-meals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('meal_date', { ascending: false });
      
      if (error) throw error;
      return data as Meal[];
    },
  });

  const { data: waterIntake, isLoading: waterIntakeLoading } = useQuery({
    queryKey: ['admin-water-intake'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_intake')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WaterIntake[];
    },
  });

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingUser.name,
          age: editingUser.age,
          health_conditions: editingUser.health_conditions,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success('Usuário atualizado com sucesso');
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
      
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="symptoms">Sintomas</TabsTrigger>
          <TabsTrigger value="meals">Diário Alimentar</TabsTrigger>
          <TabsTrigger value="water">Ingestão de Água</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-4">
            {editingUser && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold mb-4">Editar Usuário</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-1">Nome</label>
                    <Input
                      value={editingUser.name || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Idade</label>
                    <Input
                      type="number"
                      value={editingUser.age || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, age: parseInt(e.target.value) || null })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Condições de Saúde</label>
                    <Textarea
                      value={editingUser.health_conditions || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, health_conditions: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                    <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Condições</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name || '-'}</TableCell>
                        <TableCell>{user.age || '-'}</TableCell>
                        <TableCell>{user.health_conditions || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="symptoms">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Desconforto</TableHead>
                  <TableHead>Sintomas</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {symptomsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  symptoms?.map((symptom) => (
                    <TableRow key={symptom.id}>
                      <TableCell>
                        {new Date(symptom.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{symptom.discomfort_level || '-'}</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside">
                          {symptom.has_nausea && <li>Náusea</li>}
                          {symptom.has_abdominal_pain && <li>Dor Abdominal</li>}
                          {symptom.has_gas && <li>Gases</li>}
                          {symptom.has_bloating && <li>Inchaço</li>}
                        </ul>
                      </TableCell>
                      <TableCell>{symptom.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="meals">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Grupo Alimentar</TableHead>
                  <TableHead>Alimento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mealsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  meals?.map((meal) => (
                    <TableRow key={meal.id}>
                      <TableCell>
                        {new Date(meal.meal_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>Fase {meal.protocol_phase}</TableCell>
                      <TableCell>{meal.meal_type}</TableCell>
                      <TableCell>{meal.food_group}</TableCell>
                      <TableCell>{meal.custom_food || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="water">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Quantidade (ml)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waterIntakeLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  waterIntake?.map((intake) => (
                    <TableRow key={intake.id}>
                      <TableCell>
                        {new Date(intake.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{intake.amount_ml}ml</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
