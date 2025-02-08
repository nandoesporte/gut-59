
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  phase: number;
}

interface MealLoggerProps {
  date: Date;
  setDate: (date: Date) => void;
  protocolFoods: ProtocolFood[];
  onMealLogged: () => void;
}

const MealLogger = ({ date, setDate, protocolFoods, onMealLogged }: MealLoggerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");

  const groupedFoods = protocolFoods.reduce((acc, food) => {
    const key = food.food_group;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(food);
    return acc;
  }, {} as Record<string, ProtocolFood[]>);

  const handleFoodLog = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          meal_type: mealType,
          protocol_phase: phase ? parseInt(phase) : null,
          protocol_food_id: selectedFood,
          meal_date: format(date, 'yyyy-MM-dd'),
        });

      if (error) throw error;

      toast({
        title: "Refeição registrada",
        description: "Seu registro alimentar foi salvo com sucesso.",
      });

      setMealType("");
      setPhase("");
      setSelectedFood("");
      onMealLogged();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível salvar sua refeição. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-sm border-none">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Nova Refeição</h2>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="w-full bg-gray-50 border-gray-200">
              <SelectValue placeholder="Selecione a refeição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Café da manhã</SelectItem>
              <SelectItem value="lunch">Almoço</SelectItem>
              <SelectItem value="dinner">Jantar</SelectItem>
              <SelectItem value="snack">Lanche</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fase do Protocolo
              </label>
              <Select value={phase} onValueChange={setPhase}>
                <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Fase 1 - Remoção e Desintoxicação</SelectItem>
                  <SelectItem value="2">Fase 2 - Reequilíbrio da Microbiota</SelectItem>
                  <SelectItem value="3">Fase 3 - Reparo e Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alimentos do Protocolo
              </label>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(groupedFoods).map(([group, foods]) => (
                  <AccordionItem key={group} value={group}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      {group.charAt(0).toUpperCase() + group.slice(1)}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                        <div className="space-y-2">
                          {foods
                            .filter(food => !phase || food.phase === parseInt(phase))
                            .map((food) => (
                              <div
                                key={food.id}
                                className={cn(
                                  "flex items-center space-x-2 rounded-lg p-2 cursor-pointer hover:bg-gray-100",
                                  selectedFood === food.id && "bg-primary-50"
                                )}
                                onClick={() => setSelectedFood(food.id)}
                              >
                                <div className="w-2 h-2 rounded-full bg-primary-300" />
                                <span className="text-sm text-gray-700">{food.name}</span>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          <Button
            onClick={handleFoodLog}
            disabled={loading || !mealType || !selectedFood}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white"
          >
            {loading ? "Registrando..." : "Registrar Refeição"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MealLogger;
