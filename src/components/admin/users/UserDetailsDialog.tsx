
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
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [messages, setMessages] = useState<any[]>([]);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  useEffect(() => {
    if (user && open) {
      fetchMessages();
    }
  }, [user, open]);

  const fetchMessages = async () => {
    if (!user) return;

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    if (!adminUser) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        content,
        created_at,
        read,
        profiles!messages_sender_id_fkey (
          name,
          photo_url
        )
      `)
      .or(`and(sender_id.eq.${adminUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${adminUser.id})`)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const toggleDay = (day: string) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (!user) return null;

  const getMealTypeDisplay = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'Café da manhã';
      case 'lunch':
        return 'Almoço';
      case 'dinner':
        return 'Jantar';
      case 'snack':
        return 'Lanche';
      default:
        return mealType;
    }
  };

  // Group meals by date
  const mealsByDate = user.meals.reduce((acc, meal) => {
    const date = meal.meal_date ? format(new Date(meal.meal_date), 'yyyy-MM-dd') : 'Sem data';
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meal);
    return acc;
  }, {} as Record<string, typeof user.meals>);

  // Group water intake by date and calculate totals
  const waterByDate = user.water_intake.reduce((acc, intake) => {
    const date = format(new Date(intake.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = {
        intakes: [],
        total: 0
      };
    }
    acc[date].intakes.push(intake);
    acc[date].total += intake.amount_ml;
    return acc;
  }, {} as Record<string, { intakes: typeof user.water_intake, total: number }>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Usuário</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="protocol">Protocolo</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="meals">Refeições</TabsTrigger>
            <TabsTrigger value="water">Água</TabsTrigger>
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
            <div className="flex flex-col h-[500px] bg-gray-50 rounded-lg p-4">
              <div className="flex-1 overflow-y-auto mb-4">
                <MessageList messages={messages} selectedUserId={user.id} />
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <MessageInput
                  newMessage={newMessage}
                  onMessageChange={onMessageChange}
                  onSendMessage={() => {
                    onSendMessage();
                    setTimeout(fetchMessages, 500);
                  }}
                  loading={loading}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meals" className="space-y-4">
            {Object.entries(mealsByDate).map(([date, meals]) => (
              <Card key={date} className="overflow-hidden">
                <div
                  className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDay(date)}
                >
                  <h3 className="font-medium">
                    {format(new Date(date), 'dd/MM/yyyy')}
                  </h3>
                  <Button variant="ghost" size="icon">
                    {expandedDays.includes(date) ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
                {expandedDays.includes(date) && (
                  <div className="p-4 space-y-4">
                    {meals.map((meal) => (
                      <div key={meal.id} className="border-b pb-4 last:border-b-0 last:pb-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{getMealTypeDisplay(meal.meal_type || '')}</p>
                            {meal.protocol_phase && (
                              <p className="text-sm text-gray-500">
                                Fase {meal.protocol_phase}
                              </p>
                            )}
                          </div>
                        </div>
                        {meal.custom_food && (
                          <p className="text-sm mt-2">{meal.custom_food}</p>
                        )}
                        {meal.description && (
                          <p className="text-sm text-gray-600 mt-1">{meal.description}</p>
                        )}
                        {meal.photo_url && (
                          <img
                            src={meal.photo_url}
                            alt="Foto da refeição"
                            className="mt-2 w-full h-48 object-cover rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="water" className="space-y-4">
            {Object.entries(waterByDate).map(([date, { intakes, total }]) => (
              <Card key={date} className="overflow-hidden">
                <div
                  className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDay(date)}
                >
                  <div>
                    <h3 className="font-medium">
                      {format(new Date(date), 'dd/MM/yyyy')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Total: {total}ml
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    {expandedDays.includes(date) ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
                {expandedDays.includes(date) && (
                  <div className="p-4">
                    <div className="space-y-2">
                      {intakes.map((intake) => (
                        <div key={intake.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">
                            {format(new Date(intake.created_at), 'HH:mm')}
                          </span>
                          <span className="font-medium">{intake.amount_ml}ml</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
