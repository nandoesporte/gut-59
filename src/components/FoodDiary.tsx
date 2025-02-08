
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Droplets, Plus } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ProtocolFood {
  id: string;
  name: string;
  food_group: string;
  food_group_id: number;
  phase: number;
  phase_id: number;
}

interface FoodGroup {
  id: number;
  name: string;
  display_name: string;
}

interface MealType {
  id: number;
  name: string;
  display_name: string;
  phase: number | null;
}

const FoodDiary = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mealType, setMealType] = useState<string>("");
  const [phase, setPhase] = useState<string>("");
  const [selectedFood, setSelectedFood] = useState<string>("");
  const [waterPercentage, setWaterPercentage] = useState(0);
  const [date, setDate] = useState<Date>(new Date());
  const [protocolFoods, setProtocolFoods] = useState<ProtocolFood[]>([]);
  const [foodGroups, setFoodGroups] = useState<FoodGroup[]>([]);
  const [mealTypes, setMealTypes] = useState<MealType[]>([]);
  const [selectedFoodGroup, setSelectedFoodGroup] = useState<number | null>(null);
  const [customFood, setCustomFood] = useState("");
  const [showCustomFood, setShowCustomFood] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch food groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('food_groups')
        .select('*')
        .order('display_name');

      if (groupsError) throw groupsError;
      setFoodGroups(groupsData || []);

      // Fetch meal types
      const { data: mealTypesData, error: mealTypesError } = await supabase
        .from('meal_types')
        .select('*')
        .order('id');

      if (mealTypesError) throw mealTypesError;
      setMealTypes(mealTypesData || []);

      // Fetch protocol foods
      const { data: foodsData, error: foodsError } = await supabase
        .from('protocol_foods')
        .select('*')
        .order('name');

      if (foodsError) throw foodsError;
      setProtocolFoods(foodsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

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
          protocol_food_id: showCustomFood ? null : selectedFood,
          custom_food: showCustomFood ? customFood : null,
          food_group_id: selectedFoodGroup,
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
      setCustomFood("");
      setShowCustomFood(false);
      setSelectedFoodGroup(null);
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

  const handleAddWater = async () => {
    try {
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
        .from('water_intake')
        .insert({
          user_id: user.id,
          amount_ml: 200,
        });

      if (error) throw error;

      setWaterPercentage(prev => Math.min(100, prev + 5));

      toast({
        title: "Água registrada",
        description: "200ml de água registrados com sucesso.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro ao registrar",
        description: "Não foi possível registrar a água. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-primary-700 mb-2">Diário Alimentar</h1>
        <p className="text-primary-600">
          Acompanhe sua jornada de modulação intestinal registrando suas refeições diárias.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary-500" />
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
                  {mealTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.display_name}
                    </SelectItem>
                  ))}
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
                    Grupo Alimentar
                  </label>
                  <Select 
                    value={selectedFoodGroup?.toString() || ""} 
                    onValueChange={(value) => setSelectedFoodGroup(Number(value))}
                  >
                    <SelectTrigger className="w-full bg-gray-50 border-gray-200">
                      <SelectValue placeholder="Selecione o grupo alimentar" />
                    </SelectTrigger>
                    <SelectContent>
                      {foodGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Alimentos
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomFood(!showCustomFood)}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {showCustomFood ? "Escolher dos alimentos permitidos" : "Adicionar alimento personalizado"}
                    </Button>
                  </div>

                  {showCustomFood ? (
                    <Input
                      placeholder="Digite o nome do alimento"
                      value={customFood}
                      onChange={(e) => setCustomFood(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="space-y-2">
                        {protocolFoods
                          .filter(food => 
                            (!phase || food.phase === parseInt(phase)) &&
                            (!selectedFoodGroup || food.food_group_id === selectedFoodGroup)
                          )
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
                  )}
                </div>
              </div>

              <Button
                onClick={handleFoodLog}
                disabled={loading || !mealType || (!selectedFood && !customFood) || !selectedFoodGroup}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white"
              >
                {loading ? "Registrando..." : "Registrar Refeição"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Droplets className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">Ingestão de água</h2>
            </div>
            <div className="w-32 h-32 mx-auto">
              <CircularProgressbar
                value={waterPercentage}
                text={`${waterPercentage}%`}
                styles={buildStyles({
                  textSize: '16px',
                  pathColor: '#34D399',
                  textColor: '#34D399',
                  trailColor: '#E5E7EB',
                })}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleAddWater}
                className="bg-primary-50 hover:bg-primary-100 text-primary-500"
                variant="ghost"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar 200ml
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FoodDiary;

