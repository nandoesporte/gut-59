
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageList } from "../messages/MessageList";
import { MessageInput } from "../messages/MessageInput";
import { UserDetails } from "../types";

interface UserDetailsDialogProps {
  user: UserDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onSendMessage: () => void;
  newMessage: string;
  onMessageChange: (message: string) => void;
  loading: boolean;
}

export const UserDetailsDialog = ({
  user,
  open,
  onOpenChange,
  onEdit,
  onSendMessage,
  newMessage,
  onMessageChange,
  loading,
}: UserDetailsDialogProps) => {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="protocol">Protocolo</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Nome</label>
                <p className="mt-1">{user.name || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium">Idade</label>
                <p className="mt-1">{user.age || '-'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">Condições de Saúde</label>
              <p className="mt-1">{user.health_conditions || '-'}</p>
            </div>
            <Button onClick={onEdit}>
              Editar Informações
            </Button>
          </TabsContent>

          <TabsContent value="protocol">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {user.education_progress.map((progress) => (
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
              <MessageList messages={[]} selectedUserId={user.id} />
              <MessageInput
                newMessage={newMessage}
                onMessageChange={onMessageChange}
                onSendMessage={onSendMessage}
                loading={loading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
