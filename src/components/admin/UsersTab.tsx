
import { useState } from "react";
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
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, UserDetails } from "./types";
import { format } from "date-fns";
import { MessageList } from "./messages/MessageList";
import { MessageInput } from "./messages/MessageInput";

export const UsersTab = () => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: users, isLoading: usersLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data as User[];
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
      refetch();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleViewDetails = async (user: User) => {
    try {
      const [meals, symptoms, waterIntake, progress] = await Promise.all([
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('symptoms')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('water_intake')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('education_progress')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ]);

      if (meals.error) throw meals.error;
      if (symptoms.error) throw symptoms.error;
      if (waterIntake.error) throw waterIntake.error;
      if (progress.error) throw progress.error;

      setSelectedUser({
        ...user,
        meals: meals.data,
        symptoms: symptoms.data,
        water_intake: waterIntake.data,
        education_progress: progress.data,
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Erro ao carregar detalhes do usuário');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          sender_id: user.id,
          receiver_id: selectedUser.id,
        });

      if (error) throw error;

      setNewMessage("");
      toast.success('Mensagem enviada com sucesso');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  return (
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

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="protocol">Protocolo</TabsTrigger>
                <TabsTrigger value="messages">Mensagens</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Nome</label>
                    <p className="mt-1">{selectedUser.name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Idade</label>
                    <p className="mt-1">{selectedUser.age || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Condições de Saúde</label>
                  <p className="mt-1">{selectedUser.health_conditions || '-'}</p>
                </div>
                <Button
                  onClick={() => {
                    setEditingUser(selectedUser);
                    setShowDetails(false);
                  }}
                >
                  Editar Informações
                </Button>
              </TabsContent>

              <TabsContent value="protocol">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {selectedUser.education_progress.map((progress) => (
                      <Card key={progress.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Fase {progress.phase}</p>
                            <p className="text-sm text-gray-500">Dia {progress.day}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Status:</span>
                            <span className={`px-2 py-1 rounded text-sm ${
                              progress.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {progress.completed ? 'Concluído' : 'Em Andamento'}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages">
                <div className="flex flex-col h-[500px]">
                  <MessageList messages={[]} selectedUserId={selectedUser.id} />
                  <MessageInput
                    newMessage={newMessage}
                    onMessageChange={setNewMessage}
                    onSendMessage={sendMessage}
                    loading={loading}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

